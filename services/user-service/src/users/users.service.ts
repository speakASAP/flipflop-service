/**
 * Users Service
 * Handles user profile and address management
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@e-commerce/shared';
import { LoggerService } from '@e-commerce/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isAdmin: user.isAdmin,
    };
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, dto: any) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });

    this.logger.log('User profile updated', { userId });
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isAdmin: user.isAdmin,
    };
  }

  /**
   * Get user's delivery addresses
   */
  async getAddresses(userId: string) {
    const addresses = await this.prisma.deliveryAddress.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map((addr) => ({
      id: addr.id,
      firstName: addr.firstName,
      lastName: addr.lastName,
      street: addr.street,
      city: addr.city,
      postalCode: addr.postalCode,
      country: addr.country,
      phone: addr.phone || undefined,
      isDefault: addr.isDefault,
      createdAt: addr.createdAt.toISOString(),
      updatedAt: addr.updatedAt.toISOString(),
    }));
  }

  /**
   * Create delivery address
   */
  async createAddress(userId: string, dto: any) {
    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.deliveryAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.deliveryAddress.create({
      data: {
        userId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country || 'Czech Republic',
        phone: dto.phone,
        isDefault: dto.isDefault || false,
      },
    });

    this.logger.log('Delivery address created', { userId, addressId: address.id });
    return {
      id: address.id,
      firstName: address.firstName,
      lastName: address.lastName,
      street: address.street,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || undefined,
      isDefault: address.isDefault,
      createdAt: address.createdAt.toISOString(),
      updatedAt: address.updatedAt.toISOString(),
    };
  }

  /**
   * Update delivery address
   */
  async updateAddress(userId: string, addressId: string, dto: any) {
    const address = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.deliveryAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.deliveryAddress.update({
      where: { id: addressId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        street: dto.street,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country,
        phone: dto.phone,
        isDefault: dto.isDefault,
      },
    });

    this.logger.log('Delivery address updated', { userId, addressId });
    return {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      street: updated.street,
      city: updated.city,
      postalCode: updated.postalCode,
      country: updated.country,
      phone: updated.phone || undefined,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete delivery address
   */
  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.deliveryAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.deliveryAddress.delete({
      where: { id: addressId },
    });

    this.logger.log('Delivery address deleted', { userId, addressId });
    return { success: true };
  }
}

