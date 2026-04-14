import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { LoggerService, PricingEventsPublisher, PrismaService } from '@flipflop/shared';

type PriceSuggestionRow = {
  id: string;
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  rationale: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PricingService {
  private static readonly MAX_LIMIT = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly pricingEventsPublisher: PricingEventsPublisher,
  ) {}

  async getSuggestions(limitParam?: string, statusParam?: string): Promise<{
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      currentPrice: number;
      suggestedPrice: number;
      changePercent: number;
      rationale: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    limit: number;
    status: string;
  }> {
    const parsed =
      limitParam !== undefined && limitParam !== '' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const rawLimit = Number.isFinite(parsed) && parsed > 0 ? parsed : PricingService.MAX_LIMIT;
    const limit = Math.min(Math.max(rawLimit, 1), PricingService.MAX_LIMIT);
    const status = statusParam && statusParam.trim() ? statusParam.trim().toLowerCase() : 'pending';

    const rows = await this.prisma.$queryRaw<PriceSuggestionRow[]>(
      Prisma.sql`
        SELECT
          id,
          "productId",
          "productName",
          "currentPrice",
          "suggestedPrice",
          "changePercent",
          rationale,
          status,
          "createdAt",
          "updatedAt"
        FROM price_suggestion
        WHERE status = ${status}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `,
    );

    const totalRows = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM price_suggestion
        WHERE status = ${status}
      `,
    );
    const total = Number(totalRows[0]?.total ?? 0);

    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.productId,
        productName: row.productName,
        currentPrice: Number(row.currentPrice),
        suggestedPrice: Number(row.suggestedPrice),
        changePercent: Number(row.changePercent),
        rationale: row.rationale,
        status: row.status,
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      })),
      total,
      limit,
      status,
    };
  }

  async generateSuggestions(): Promise<{ generated: number }> {
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const aiServiceBase =
      this.configService.get<string>('AI_SERVICE_URL') ?? 'http://ai-microservice:3380';
    const aiUrl = `${aiServiceBase.replace(/\/$/, '')}/ai/complete`;

    const products = await this.prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        price: number;
        category: string | null;
      }>
    >(
      Prisma.sql`
        SELECT
          p.id,
          p.name,
          p.price::double precision AS price,
          MIN(c.name) AS category
        FROM products p
        LEFT JOIN product_categories pc ON pc."productId" = p.id
        LEFT JOIN categories c ON c.id = pc."categoryId"
        WHERE p."isActive" = true
        GROUP BY p.id, p.name, p.price, p."updatedAt"
        ORDER BY p."updatedAt" DESC
        LIMIT ${PricingService.MAX_LIMIT}
      `,
    );

    let generated = 0;
    for (const product of products) {
      const productStartedAt = Date.now();
      const currentPrice = Number(product.price);
      if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
        this.logger.warn('Pricing suggestion skipped due to invalid price', {
          timestamp: new Date().toISOString(),
          product_id: product.id,
          current_price: product.price,
        });
        continue;
      }

      try {
        const existing = await this.prisma.$queryRaw<
          Array<{
            id: string;
            status: string;
          }>
        >(
          Prisma.sql`
            SELECT id, status
            FROM price_suggestion
            WHERE "productId" = ${product.id}
            ORDER BY "createdAt" DESC
            LIMIT 1
          `,
        );
        const current = existing[0];
        if (current && (current.status === 'approved' || current.status === 'rejected')) {
          this.logger.log('Pricing suggestion skipped due to final status', {
            timestamp: new Date().toISOString(),
            product_id: product.id,
            status: current.status,
          });
          continue;
        }

        const message = `Product: ${product.name}. Current price: ${currentPrice} CZK. Category: ${
          product.category ?? 'General'
        }. Suggest an optimal retail price in CZK for a Czech e-commerce platform. Reply with JSON only: {"suggestedPrice": <number>, "rationale": "<one sentence>"}.`;

        const aiResponse = await this.httpService.axiosRef.post(aiUrl, {
          tier: 'cheap',
          messages: [{ role: 'user', content: message }],
          output_schema: { suggestedPrice: 'number', rationale: 'string' },
        });

        const parsed = this.parseAiSuggestion(aiResponse.data as Record<string, unknown>);
        if (!parsed) {
          this.logger.warn('Pricing suggestion skipped due to unparsable AI response', {
            timestamp: new Date().toISOString(),
            product_id: product.id,
          });
          continue;
        }

        const suggestedPrice = parsed.suggestedPrice;
        const changePercent = ((suggestedPrice - currentPrice) / currentPrice) * 100;
        const rationale = parsed.rationale || null;

        if (current?.id) {
          await this.prisma.$executeRaw(
            Prisma.sql`
              UPDATE price_suggestion
              SET
                "productName" = ${product.name},
                "currentPrice" = ${currentPrice},
                "suggestedPrice" = ${suggestedPrice},
                "changePercent" = ${changePercent},
                rationale = ${rationale},
                status = 'pending',
                "updatedAt" = NOW()
              WHERE id = ${current.id} AND status = 'pending'
            `,
          );
        } else {
          await this.prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO price_suggestion (
                id,
                "productId",
                "productName",
                "currentPrice",
                "suggestedPrice",
                "changePercent",
                rationale,
                status,
                "createdAt",
                "updatedAt"
              )
              VALUES (
                gen_random_uuid()::text,
                ${product.id},
                ${product.name},
                ${currentPrice},
                ${suggestedPrice},
                ${changePercent},
                ${rationale},
                'pending',
                NOW(),
                NOW()
              )
            `,
          );
        }

        generated += 1;
        this.logger.log('Pricing suggestion generated', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - productStartedAt,
          product_id: product.id,
          suggested_price: suggestedPrice,
          change_percent: Math.round(changePercent * 100) / 100,
        });
      } catch (error: unknown) {
        this.logger.error('Pricing suggestion generation failed for product', {
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - productStartedAt,
          product_id: product.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.log('Pricing suggestion generation completed', {
      timestamp,
      duration_ms: Date.now() - startedAt,
      generated,
      processed: products.length,
    });

    return { generated };
  }

  async approveSuggestion(id: string): Promise<{ success: true; newPrice: number }> {
    const suggestion = await this.getSuggestionById(id);
    if (!suggestion) {
      throw new NotFoundException('Price suggestion not found');
    }
    if (suggestion.status !== 'pending') {
      throw new BadRequestException('Only pending suggestions can be approved');
    }
    if (Math.abs(Number(suggestion.changePercent)) > 30) {
      throw new BadRequestException('Change exceeds 30% safety limit');
    }

    const approvedAt = new Date().toISOString();
    const oldPrice = Number(suggestion.currentPrice);
    const newPrice = Number(suggestion.suggestedPrice);
    const changePercent = Number(suggestion.changePercent);

    await this.prisma.$transaction([
      this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE products
          SET
            price = ${newPrice},
            "updatedAt" = NOW()
          WHERE id = ${suggestion.productId}
        `,
      ),
      this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE price_suggestion
          SET
            status = 'approved',
            "updatedAt" = NOW()
          WHERE id = ${id}
        `,
      ),
    ]);

    const exchangeName = 'pricing.events';
    const routingKey = 'pricing.price_changed';
    const published = await this.pricingEventsPublisher.publishPriceChanged({
      productId: suggestion.productId,
      productName: suggestion.productName,
      oldPrice,
      newPrice,
      changePercent,
      approvedAt,
    });
    if (!published) {
      this.logger.warn('pricing.price_changed event publish failed', {
        timestamp: new Date().toISOString(),
        exchange: exchangeName,
        routing_key: routingKey,
        suggestion_id: id,
        product_id: suggestion.productId,
      });
    }

    return { success: true, newPrice };
  }

  async rejectSuggestion(id: string): Promise<{ success: true }> {
    const suggestion = await this.getSuggestionById(id);
    if (!suggestion) {
      throw new NotFoundException('Price suggestion not found');
    }
    if (suggestion.status !== 'pending') {
      throw new BadRequestException('Only pending suggestions can be rejected');
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE price_suggestion
        SET
          status = 'rejected',
          "updatedAt" = NOW()
        WHERE id = ${id}
      `,
    );
    return { success: true };
  }

  private parseAiSuggestion(
    data: Record<string, unknown> | null | undefined,
  ): { suggestedPrice: number; rationale: string } | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const fromDirect = this.getSuggestionFromPayload(data);
    if (fromDirect) {
      return fromDirect;
    }

    const candidates: Array<unknown> = [
      (data as { text?: unknown }).text,
      (data as { content?: unknown }).content,
      (data as { result?: unknown }).result,
      (data as { response?: unknown }).response,
    ];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string' || !candidate.trim()) {
        continue;
      }
      try {
        const parsed = JSON.parse(candidate) as Record<string, unknown>;
        const fromText = this.getSuggestionFromPayload(parsed);
        if (fromText) {
          return fromText;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private getSuggestionFromPayload(
    payload: Record<string, unknown>,
  ): { suggestedPrice: number; rationale: string } | null {
    const suggestedPrice = payload.suggestedPrice;
    const rationale = payload.rationale;
    if (
      typeof suggestedPrice === 'number' &&
      Number.isFinite(suggestedPrice) &&
      suggestedPrice > 0 &&
      typeof rationale === 'string'
    ) {
      return {
        suggestedPrice,
        rationale: rationale.trim(),
      };
    }
    return null;
  }

  private async getSuggestionById(id: string): Promise<PriceSuggestionRow | null> {
    const rows = await this.prisma.$queryRaw<PriceSuggestionRow[]>(
      Prisma.sql`
        SELECT
          id,
          "productId",
          "productName",
          "currentPrice",
          "suggestedPrice",
          "changePercent",
          rationale,
          status,
          "createdAt",
          "updatedAt"
        FROM price_suggestion
        WHERE id = ${id}
        LIMIT 1
      `,
    );
    return rows[0] ?? null;
  }
}
