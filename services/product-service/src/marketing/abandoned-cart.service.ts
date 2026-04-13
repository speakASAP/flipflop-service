/**
 * Abandoned cart: pending unpaid orders past a threshold → one recovery e-mail per order (AI copy).
 */

import {
  Injectable,
  BadRequestException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  LoggerService,
  NotificationService,
  OrderStatus,
  PaymentStatus,
  PrismaService,
} from '@flipflop/shared';

@Injectable()
export class AbandonedCartService implements OnModuleInit, OnModuleDestroy {
  private recoveryInterval?: ReturnType<typeof setInterval>;
  private readonly defaultThresholdMinutes: number;
  private readonly jobIntervalMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly notificationService: NotificationService,
    private readonly logger: LoggerService,
  ) {
    const t = Number(this.configService.get<string>('ABANDONED_CART_THRESHOLD_MINUTES'));
    this.defaultThresholdMinutes =
      Number.isFinite(t) && t > 0 ? t : 120;
    const j = Number(this.configService.get<string>('ABANDONED_CART_JOB_INTERVAL_MINUTES'));
    const safeJ = Number.isFinite(j) && j > 0 ? j : 30;
    this.jobIntervalMs = safeJ * 60 * 1000;
  }

  onModuleInit(): void {
    this.recoveryInterval = setInterval(() => {
      void this.runRecoveryJob();
    }, this.jobIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
    }
  }

  async findAbandonedOrders(thresholdMinutes: number = this.defaultThresholdMinutes) {
    const safeMinutes = Number.isFinite(thresholdMinutes) && thresholdMinutes > 0
      ? thresholdMinutes
      : this.defaultThresholdMinutes;
    const cutoff = new Date(Date.now() - safeMinutes * 60 * 1000);
    return this.prisma.order.findMany({
      where: {
        status: OrderStatus.pending,
        paymentStatus: PaymentStatus.pending,
        createdAt: { lt: cutoff },
      },
    });
  }

  async sendRecoveryEmail(orderId: string): Promise<void> {
    const methodStartedAt = Date.now();
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        users: true,
        order_items: true,
      },
    });
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    const email = order.users?.email;
    if (!email) {
      throw new BadRequestException('Order has no user email');
    }

    const lines = order.order_items
      .map((i) => `- ${i.productName} × ${i.quantity} (${Number(i.totalPrice)} Kč)`)
      .join('\n');
    const userPrompt = `Jsi copywriter pro e-shop FlipFlop.cz. Zákazník má nedokončenou objednávku č. ${order.orderNumber} (celkem ${Number(order.total)} Kč vč. DPH dle objednávky).\nPoložky:\n${lines}\n\nNapiš jeden stručný připomínkovací e-mail (lákavě, ale slušně), ať dokončí platbu. Odpověz POUZE jako jeden JSON objekt bez markdownu, ve tvaru:\n{"subject":"...","body":"..."}\nPředmět max 80 znaků. Tělo v češtině, HTML povoleno (jednoduché značky), max ~800 znaků.`;

    const aiUrl =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://e-commerce-ai-service:3007';
    const requestStartedAt = Date.now();
    let rawText = '';
    try {
      const aiRes = await this.httpService.axiosRef.post(`${aiUrl}/ai/complete`, {
        model_tier: 'free',
        user_prompt: userPrompt,
        max_tokens: 800,
        correlation_id: `abandoned-cart-${orderId}-${Date.now()}`,
      });
      rawText =
        aiRes.data?.text ?? aiRes.data?.content ?? aiRes.data?.result ?? '';
    } catch (error: unknown) {
      this.logger.error('sendRecoveryEmail AI request failed', {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - methodStartedAt,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestException('AI service unavailable for recovery e-mail');
    }

    this.logger.log('sendRecoveryEmail AI response received', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - requestStartedAt,
      orderId,
    });

    const { subject, body } = this.parseAiSubjectBody(rawText);
    await this.notificationService.sendMarketingEmail(email, subject, body);
    this.logger.log('sendRecoveryEmail sent', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - methodStartedAt,
      orderId,
    });
  }

  async markRecoverySent(orderId: string): Promise<void> {
    try {
      await this.prisma.abandonedCartLog.create({
        data: { orderId },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  async runRecoveryJob(): Promise<void> {
    const jobStartedAt = Date.now();
    const abandoned = await this.findAbandonedOrders();
    if (!abandoned.length) {
      return;
    }
    const existing = await this.prisma.abandonedCartLog.findMany({
      where: { orderId: { in: abandoned.map((o) => o.id) } },
      select: { orderId: true },
    });
    const sent = new Set(existing.map((r) => r.orderId));
    const pending = abandoned.filter((o) => !sent.has(o.id));

    this.logger.log('runRecoveryJob scan', {
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - jobStartedAt,
      abandonedCount: abandoned.length,
      toSendCount: pending.length,
    });

    for (const o of pending) {
      const oneStarted = Date.now();
      try {
        await this.sendRecoveryEmail(o.id);
        await this.markRecoverySent(o.id);
      } catch (error: unknown) {
        this.logger.error('runRecoveryJob order failed', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - oneStarted,
          orderId: o.id,
          orderNumber: o.orderNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
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
      throw new BadRequestException('Invalid AI JSON for recovery e-mail');
    }
  }
}
