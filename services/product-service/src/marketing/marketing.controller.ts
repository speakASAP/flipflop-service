import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { EmailCampaignService } from './email-campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('internal/marketing')
export class MarketingController {
  constructor(private readonly emailCampaignService: EmailCampaignService) {}

  @Post('campaigns')
  async createCampaign(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Body() dto: CreateCampaignDto,
  ) {
    this.emailCampaignService.assertInternalServiceKey(internalKey);
    return this.emailCampaignService.createDraftCampaign(dto.goalId, dto.productIds);
  }

  @Post('campaigns/:id/send')
  async sendCampaign(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Param('id') id: string,
  ) {
    this.emailCampaignService.assertInternalServiceKey(internalKey);
    await this.emailCampaignService.sendCampaign(id);
    return { ok: true };
  }
}
