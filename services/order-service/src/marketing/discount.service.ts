import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma, type DiscountCode } from '@prisma/client';
import { PrismaService } from '@flipflop/shared';
import { LoggerService } from '@flipflop/shared';

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 8;

@Injectable()
export class DiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private randomCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let out = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return out;
  }

  async generateCode(params: {
    type: 'percentage' | 'fixed';
    value: number;
    maxUses: number;
    expiresAt?: Date;
    goalId?: string;
  }): Promise<DiscountCode> {
    if (params.type === 'percentage' && (params.value < 0 || params.value > 100)) {
      throw new BadRequestException('Percentage value must be between 0 and 100');
    }
    if (params.type === 'fixed' && params.value < 0) {
      throw new BadRequestException('Fixed discount must be non-negative');
    }

    for (let attempt = 0; attempt < 20; attempt++) {
      const code = this.randomCode();
      try {
        const row = await this.prisma.discountCode.create({
          data: {
            code,
            type: params.type,
            value: params.value,
            maxUses: params.maxUses,
            expiresAt: params.expiresAt ?? null,
            goalId: params.goalId ?? null,
          },
        });
        return row;
      } catch (e: unknown) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue;
        }
        throw e;
      }
    }
    throw new BadRequestException('Could not allocate a unique discount code');
  }

  /**
   * When valid: discountValue is the stored rule amount (percentage points or fixed currency);
   * type indicates how to apply it in applyDiscount.
   */
  async validateCode(code: string): Promise<{ valid: boolean; discountValue: number; type: string }> {
    const normalized = this.normalizeCode(code);
    if (!normalized) {
      return { valid: false, discountValue: 0, type: '' };
    }
    const row = await this.prisma.discountCode.findUnique({
      where: { code: normalized },
    });
    if (!row) {
      return { valid: false, discountValue: 0, type: '' };
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      return { valid: false, discountValue: 0, type: '' };
    }
    if (row.usedCount >= row.maxUses) {
      return { valid: false, discountValue: 0, type: '' };
    }
    return { valid: true, discountValue: row.value, type: row.type };
  }

  async applyDiscount(orderTotal: number, code: string): Promise<number> {
    const normalized = this.normalizeCode(code);
    const row = await this.prisma.discountCode.findUnique({
      where: { code: normalized },
    });
    if (!row) {
      throw new BadRequestException('Invalid discount code');
    }
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Discount code has expired');
    }
    if (row.usedCount >= row.maxUses) {
      throw new BadRequestException('Discount code is no longer available');
    }
    const t = Number(orderTotal);
    if (!Number.isFinite(t) || t < 0) {
      return 0;
    }
    let reduction = 0;
    if (row.type === 'percentage') {
      reduction = Math.floor((t * row.value) / 100);
    } else if (row.type === 'fixed') {
      reduction = row.value;
    } else {
      throw new BadRequestException('Invalid discount code type');
    }
    const next = t - reduction;
    return Math.max(0, Math.round(next * 100) / 100);
  }

  async redeemCode(code: string, orderId: string): Promise<boolean> {
    const normalized = this.normalizeCode(code);
    const discount = await this.prisma.discountCode.findUnique({
      where: { code: normalized },
    });
    if (!discount) {
      this.logger.warn('Discount redeem: code not found', { orderId, code: normalized });
      return false;
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.discountCode.findUnique({
          where: { id: discount.id },
        });
        if (!fresh) {
          return;
        }
        const existing = await tx.discountCodeRedemption.findUnique({
          where: {
            codeId_orderId: { codeId: fresh.id, orderId },
          },
        });
        if (existing) {
          return;
        }
        if (fresh.usedCount >= fresh.maxUses) {
          throw new Error('Discount code usage limit reached');
        }
        await tx.discountCodeRedemption.create({
          data: { codeId: fresh.id, orderId },
        });
        await tx.discountCode.update({
          where: { id: fresh.id },
          data: { usedCount: { increment: 1 } },
        });
      });
      return true;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error('Discount redeem failed', {
        timestamp: new Date().toISOString(),
        orderId,
        code: normalized,
        error: message,
      });
      return false;
    }
  }

  async listCodes(): Promise<DiscountCode[]> {
    return this.prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
