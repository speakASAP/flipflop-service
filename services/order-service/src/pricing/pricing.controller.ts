import { Controller, Get, Patch, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, JwtAuthGuard } from '@flipflop/shared';
import { PricingService } from './pricing.service';

@Controller('admin/pricing')
@UseGuards(JwtAuthGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('suggestions')
  async listSuggestions(@Query('limit') limit = '50', @Query('status') status = 'pending') {
    const payload = await this.pricingService.getSuggestions(limit, status);
    return ApiResponse.success(payload);
  }

  @Post('generate')
  async generateSuggestions() {
    const result = await this.pricingService.generateSuggestions();
    return ApiResponse.success({ message: 'Price suggestions generated', ...result });
  }

  @Patch('suggestions/:id/approve')
  async approveSuggestion(@Param('id') id: string) {
    const result = await this.pricingService.approveSuggestion(id);
    return ApiResponse.success({ message: 'Price approved', ...result });
  }

  @Patch('suggestions/:id/reject')
  async rejectSuggestion(@Param('id') id: string) {
    const result = await this.pricingService.rejectSuggestion(id);
    return ApiResponse.success({ message: 'Price suggestion rejected', ...result });
  }
}
