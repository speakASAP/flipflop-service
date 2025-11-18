/**
 * Orders Service
 * Handles order creation and management
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@e-commerce/shared';
import { LoggerService } from '@e-commerce/shared';
import { PaymentService } from '@e-commerce/shared';
import { NotificationService } from '@e-commerce/shared';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get cart items from database
   */
  private async getCartItems(userId: string): Promise<any[]> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        products: true,
        product_variants: true,
      },
    });
    return cartItems;
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Create order from cart
   */
  async createOrder(userId: string, dto: any) {
    // Get cart items
    const cartItems = await this.getCartItems(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Verify delivery address
    const deliveryAddress = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: dto.deliveryAddressId,
        userId,
      },
    });

    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const product = cartItem.products || await this.prisma.product.findUnique({
        where: { id: cartItem.productId },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException(`Product ${cartItem.productId} is not available`);
      }

      const price = cartItem.product_variants
        ? Number(cartItem.product_variants.price)
        : Number(product.price);
      const itemTotal = price * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        variantId: cartItem.variantId || null,
        productName: product.name,
        productSku: product.sku,
        quantity: cartItem.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
      });
    }

    const tax = subtotal * 0.21; // 21% VAT for Czech Republic
    const shippingCost = dto.shippingCost || 0;
    const discount = dto.discount || 0;
    const total = subtotal + tax + shippingCost - discount;

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        deliveryAddressId: dto.deliveryAddressId,
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        paymentMethod: dto.paymentMethod || 'payu',
        subtotal,
        tax,
        shippingCost,
        discount,
        total,
        notes: dto.notes,
        order_items: {
          create: orderItems,
        },
        order_status_history: {
          create: {
            status: OrderStatus.pending,
            notes: 'Order created',
          },
        },
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
    });

    // Clear cart
    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Order created', { orderId: order.id, orderNumber: order.orderNumber });

    // Send order confirmation notification
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await this.notificationService.sendOrderConfirmation(
          user.email,
          order.orderNumber,
          Number(order.total),
        );
      }
    } catch (error) {
      this.logger.warn('Failed to send order confirmation notification', { error });
    }

    return this.mapOrder(order);
  }

  /**
   * Get user's orders
   */
  async getUserOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.mapOrder(order));
  }

  /**
   * Get order by ID
   */
  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        order_items: {
          include: {
            products: true,
            product_variants: true,
          },
        },
        delivery_addresses: true,
        order_status_history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  /**
   * Create payment for order
   */
  async createPayment(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.paymentStatus === PaymentStatus.paid) {
      throw new BadRequestException('Order is already paid');
    }

    // Create payment via payment service
    const paymentResponse = await this.paymentService.createPayment({
      orderId: order.id,
      amount: Number(order.total),
      currency: 'CZK',
      paymentMethod: order.paymentMethod || 'payu',
      returnUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      cancelUrl: `${this.configService.get('FRONTEND_URL')}/checkout`,
      metadata: {
        orderNumber: order.orderNumber,
        userId,
      },
    });

    if (!paymentResponse.success || !paymentResponse.data) {
      throw new BadRequestException('Failed to create payment');
    }

    // Update order with payment transaction ID
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTransactionId: paymentResponse.data.transactionId || paymentResponse.data.id,
      },
    });

    return {
      redirectUri: paymentResponse.data.redirectUri,
      orderId: order.id,
    };
  }

  /**
   * Map order to response format
   */
  private mapOrder(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || undefined,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
      deliveryAddress: order.delivery_addresses
        ? {
            id: order.delivery_addresses.id,
            firstName: order.delivery_addresses.firstName,
            lastName: order.delivery_addresses.lastName,
            street: order.delivery_addresses.street,
            city: order.delivery_addresses.city,
            postalCode: order.delivery_addresses.postalCode,
            country: order.delivery_addresses.country,
            phone: order.delivery_addresses.phone || undefined,
            isDefault: order.delivery_addresses.isDefault,
          }
        : null,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      shippingCost: Number(order.shippingCost),
      discount: Number(order.discount),
      total: Number(order.total),
      notes: order.notes || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}

