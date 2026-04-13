import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, ApiResponse } from '@flipflop/shared';
import { DiscountService } from './discount.service';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('global:superadmin', 'app:flipflop-service:admin')
export class MarketingController {
  constructor(private readonly discountService: DiscountService) {}

  @Post('discount-codes')
  async createDiscountCode(@Body() dto: CreateDiscountCodeDto) {
    const row = await this.discountService.generateCode({
      type: dto.type,
      value: dto.value,
      maxUses: dto.maxUses,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      goalId: dto.goalId,
    });
    return ApiResponse.success({ code: row.code });
  }

  @Get('discount-codes')
  async listDiscountCodes() {
    const rows = await this.discountService.listCodes();
    return ApiResponse.success(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        value: r.value,
        maxUses: r.maxUses,
        usedCount: r.usedCount,
        remainingUses: Math.max(0, r.maxUses - r.usedCount),
        expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
        goalId: r.goalId,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  }
}
