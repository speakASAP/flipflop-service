/**
 * Orders Service
 * Handles order creation and management
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@flipflop/shared';
import { LoggerService } from '@flipflop/shared';
import { PaymentService } from '@flipflop/shared';
import { NotificationService } from '@flipflop/shared';
import { OrderStatus, PaymentStatus, OrderClientService, WarehouseClientService } from '@flipflop/shared';
import { ConfigService } from '@nestjs/config';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
    private readonly orderClient: OrderClientService,
    private readonly warehouseClient: WarehouseClientService,
  ) {}

  assertInternalServiceKey(internalKey: string | undefined): void {
    const expected = this.configService.get<string>('FLIPFLOP_INTERNAL_SERVICE_SECRET');
    if (expected && internalKey !== expected) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }

  /**
   * Apply payment callback from payments-microservice (via api-gateway).
   */
  async handlePaymentResult(body: PaymentResultDto): Promise<{ ok: boolean }> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: body.orderId },
      include: {
        order_items: true,
      },
    });

    if (!order) {
      this.logger.warn('Payment webhook: order not found', { orderNumber: body.orderId });
      return { ok: true };
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: order.userId },
    });

    if (body.status === 'completed') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.paid,
          status: OrderStatus.confirmed,
          paymentTransactionId: body.paymentId,
        },
      });

      const warehouseId = await this.warehouseClient.getDefaultWarehouseId();
      if (warehouseId) {
        for (const item of order.order_items) {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
          });
          const catalogProductId = product?.catalogProductId;
          if (!catalogProductId) {
            continue;
          }
          try {
            await this.warehouseClient.decrementStock(
              catalogProductId,
              warehouseId,
              item.quantity,
              `flipflop_order:${order.orderNumber}`,
            );
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error('Stock decrement failed after payment', {
              message,
              orderNumber: order.orderNumber,
              productId: item.productId,
            });
          }
        }
      }

      const recipient = buyer?.email;
      if (recipient) {
        try {
          await this.notificationService.sendOrderConfirmation(
            recipient,
            order.orderNumber,
            Number(order.total),
          );
        } catch (err: unknown) {
          this.logger.warn('Order confirmation email failed after payment', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return { ok: true };
    }

    if (body.status === 'failed') {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.failed },
      });
      return { ok: true };
    }

    return { ok: true };
  }

  /**
   * Internal PATCH for payment-related order fields.
   */
  async updateInternalPaymentStatus(
    orderId: string,
    dto: UpdateOrderPaymentStatusDto,
  ): Promise<{ ok: boolean }> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: dto.paymentStatus,
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.paymentTransactionId !== undefined
          ? { paymentTransactionId: dto.paymentTransactionId }
          : {}),
      },
    });
    return { ok: true };
  }

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
    const cartItems = await this.getCartItems(userId);

    if (!cartItems || cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const deliveryAddress = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: dto.deliveryAddressId,
        userId,
      },
    });

    if (!deliveryAddress) {
      throw new NotFoundException('Delivery address not found');
    }

    let subtotal = 0;
    const orderItems = [];

    for (const cartItem of cartItems) {
      const product =
        cartItem.products ||
        (await this.prisma.product.findUnique({
          where: { id: cartItem.productId },
        }));

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

    const tax = subtotal * 0.21;
    const shippingCost = dto.shippingCost || 0;
    const discount = dto.discount || 0;
    const total = subtotal + tax + shippingCost - discount;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        deliveryAddressId: dto.deliveryAddressId,
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        paymentMethod: dto.paymentMethod || 'webpay',
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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const callbackUrlBase =
      this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.statex.cz';
    const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;

    let paymentResult;
    try {
      paymentResult = await this.paymentService.createPayment({
        orderId: order.orderNumber,
        applicationId: 'flipflop-v1',
        amount: total,
        currency: 'CZK',
        paymentMethod: dto.paymentMethod || 'webpay',
        callbackUrl,
        customer: {
          email: user?.email || '',
          name: `${deliveryAddress.firstName} ${deliveryAddress.lastName}`.trim(),
        },
        description: 'FLIPFLOP',
      });
    } catch (error: unknown) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw error;
    }

    if (!paymentResult.success || !paymentResult.data?.id) {
      await this.prisma.order.delete({ where: { id: order.id } });
      throw new BadRequestException('Payment initiation failed');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentTransactionId: paymentResult.data.id },
    });

    await this.prisma.cartItem.deleteMany({
      where: { userId },
    });

    this.logger.log('Order created', { orderId: order.id, orderNumber: order.orderNumber });

    const orderWithPayment = await this.prisma.order.findUnique({
      where: { id: order.id },
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

    try {
      const orderData = {
        externalOrderId: order.orderNumber,
        channel: 'flipflop',
        customer: {
          id: userId,
          email: user?.email,
        },
        shippingAddress: deliveryAddress,
        billingAddress: deliveryAddress,
        items: orderItems.map((item) => ({
          productId: item.productId,
          sku: item.productSku,
          title: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
        })),
        subtotal: Number(order.subtotal),
        shippingCost: Number(order.shippingCost),
        taxAmount: Number(order.tax),
        total: Number(order.total),
        currency: 'CZK',
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderedAt: order.createdAt,
      };

      await this.orderClient.createOrder(orderData);
      this.logger.log('Order forwarded to orders-microservice', {
        orderId: order.id,
        orderNumber: order.orderNumber,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to forward order to orders-microservice', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: message,
      });
    }

    return {
      order: this.mapOrder(orderWithPayment),
      redirectUrl: paymentResult.data.redirectUri || null,
    };
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

    return orders.map((o) => this.mapOrder(o));
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
   * Create payment for order (legacy PayU route — same payments-microservice contract)
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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const callbackUrlBase =
      this.configService.get<string>('API_GATEWAY_URL') || 'https://flipflop.statex.cz';
    const callbackUrl = `${callbackUrlBase.replace(/\/$/, '')}/api/webhooks/payment-result`;

    const paymentResponse = await this.paymentService.createPayment({
      orderId: order.orderNumber,
      applicationId: 'flipflop-v1',
      amount: Number(order.total),
      currency: 'CZK',
      paymentMethod: order.paymentMethod || 'webpay',
      callbackUrl,
      customer: {
        email: user?.email || '',
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '',
      },
      description: 'FLIPFLOP',
    });

    if (!paymentResponse.success || !paymentResponse.data) {
      throw new BadRequestException('Failed to create payment');
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentTransactionId:
          paymentResponse.data.transactionId || paymentResponse.data.id,
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
    const lines = order.order_items || order.items || [];
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items: lines.map((item: any) => ({
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
      paymentTransactionId: order.paymentTransactionId || undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
