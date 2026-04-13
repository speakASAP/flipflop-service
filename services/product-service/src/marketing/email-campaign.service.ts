/**
 * Seasonal / marketing email campaigns: AI copy via ai-microservice, send via NotificationService.
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  PrismaService,
  LoggerService,
  NotificationService,
} from '@flipflop/shared';

export interface CampaignResult {
  campaignId: string;
  subject: string;
  body: string;
}

/** Product fields used for campaign copy (avoids Prisma version skew across workspaces). */
export interface CampaignProductRow {
  id: string;
  name: string;
  sku: string;
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
}

@Injectable()
export class EmailCampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {}

  assertInternalServiceKey(internalKey: string | undefined): void {
    const expected = this.configService.get<string>('FLIPFLOP_INTERNAL_SERVICE_SECRET');
    if (expected && internalKey !== expected) {
      throw new UnauthorizedException('Invalid internal service key');
    }
  }

  async createDraftCampaign(goalId: string, productIds: string[]): Promise<CampaignResult> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        compareAtPrice: true,
      },
    });
    return this.generateCampaign(goalId, products);
  }

  async generateCampaign(goalId: string, products: CampaignProductRow[]): Promise<CampaignResult> {
    if (!products.length) {
      throw new BadRequestException('No products for campaign');
    }

    const methodStartedAt = Date.now();
    const productLines = products
      .map(
        (p) =>
          `- ${p.name} (SKU ${p.sku}, cena ${Number(p.price)} Kč${
            p.compareAtPrice ? `, původně ${Number(p.compareAtPrice)} Kč` : ''
          })`,
      )
      .join('\n');

    const userPrompt = `Jsi copywriter pro e-shop FlipFlop.cz. Vytvoř krátký marketingový e-mail o sezónním výprodeji pro tyto produkty:\n${productLines}\n\nOdpověz POUZE jako jeden JSON objekt bez markdownu, ve tvaru:\n{"subject":"...","body":"..."}\nPředmět max 80 znaků. Tělo e-mailu v češtině, HTML povoleno (jednoduché značky), max ~800 znaků.`;

    const aiUrl =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://e-commerce-ai-service:3007';
    const requestStartedAt = Date.now();
    let rawText = '';
    try {
      const aiRes = await this.httpService.axiosRef.post(`${aiUrl}/ai/complete`, {
        model_tier: 'free',
        user_prompt: userPrompt,
        max_tokens: 800,
        correlation_id: `marketing-campaign-${goalId}-${Date.now()}`,
      });
      rawText =
        aiRes.data?.text ?? aiRes.data?.content ?? aiRes.data?.result ?? '';
    } catch (error: unknown) {
      this.logger.error('generateCampaign AI request failed', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        goalId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('AI service unavailable for campaign generation');
    }

    this.logger.log('generateCampaign AI response received', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - requestStartedAt,
      goalId,
    });

    const { subject, body } = this.parseAiSubjectBody(rawText);

    const row = await this.prisma.marketingCampaign.create({
      data: {
        goalId,
        type: 'seasonal_sale',
        subject,
        body,
        status: 'draft',
      },
    });

    this.logger.log('MarketingCampaign draft persisted', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      campaignId: row.id,
      goalId,
    });

    return {
      campaignId: row.id,
      subject: row.subject,
      body: row.body,
    };
  }

  private parseAiSubjectBody(raw: string): { subject: string; body: string } {
    const trimmed = (raw || '').trim();
    if (!trimmed) {
      throw new BadRequestException('Empty AI response');
    }
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
    try {
      const parsed = JSON.parse(jsonStr) as { subject?: string; body?: string };
      const subject = typeof parsed.subject === 'string' ? parsed.subject.trim() : '';
      const body = typeof parsed.body === 'string' ? parsed.body.trim() : '';
      if (!subject || !body) {
        throw new Error('Missing subject or body');
      }
      return { subject, body };
    } catch {
      this.logger.error('parseAiSubjectBody failed', {
        timestamp: new Date().toISOString(),
        preview: trimmed.slice(0, 200),
      });
      throw new BadRequestException('Invalid AI JSON for campaign');
    }
  }

  /**
   * Sends one campaign e-mail per verified user (no dedicated newsletter model yet).
   * After attempts: status sent if there was at least one recipient, else failed.
   */
  async sendCampaign(campaignId: string): Promise<void> {
    const methodStartedAt = Date.now();
    const campaign = await this.prisma.marketingCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.status === 'sent') {
      this.logger.log('sendCampaign skipped: already sent', {
        timestamp: new Date().toISOString(),
        campaignId,
      });
      return;
    }

    const recipients = await this.prisma.user.findMany({
      where: { isEmailVerified: true },
      select: { email: true },
    });

    if (!recipients.length) {
      await this.prisma.marketingCampaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
      this.logger.error('sendCampaign: no verified subscribers', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        campaignId,
      });
      return;
    }

    for (const { email } of recipients) {
      const t0 = Date.now();
      try {
        await this.notificationService.sendMarketingEmail(
          email,
          campaign.subject,
          campaign.body,
        );
        this.logger.log('sendCampaign recipient processed', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - t0,
          campaignId,
        });
      } catch (error: unknown) {
        this.logger.error('sendCampaign recipient failed', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - t0,
          campaignId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await this.prisma.marketingCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });

    this.logger.log('sendCampaign completed', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      campaignId,
      recipientCount: recipients.length,
    });
  }
}
