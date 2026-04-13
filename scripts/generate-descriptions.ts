/**
 * Generate AI product descriptions for products with no description.
 *
 * Usage:
 *   cd flipflop-service && npx ts-node scripts/generate-descriptions.ts
 *   cd flipflop-service && npx ts-node scripts/generate-descriptions.ts --dry-run
 *   cd flipflop-service && npx ts-node scripts/generate-descriptions.ts --dry-run --limit 5
 */

import { PrismaClient } from '@prisma/client';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Logger } = require('../utils/logger');

function loadEnvFromRootIfNeeded() {
  if (process.env.DATABASE_URL) return;
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFromRootIfNeeded();

function normalizeDatabaseUrlForHostRuntime() {
  const rawDatabaseUrl = process.env.DATABASE_URL;
  if (!rawDatabaseUrl) return;
  if (fs.existsSync('/.dockerenv')) return;

  let parsed: URL;
  try {
    parsed = new URL(rawDatabaseUrl);
  } catch {
    return;
  }

  if (parsed.hostname !== 'db-server-postgres') return;
  parsed.hostname = '127.0.0.1';
  process.env.DATABASE_URL = parsed.toString();
}

normalizeDatabaseUrlForHostRuntime();

const AI_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:3380';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const i = process.argv.indexOf('--limit');
  if (i === -1 || !process.argv[i + 1]) return 0;
  const parsed = Number.parseInt(process.argv[i + 1], 10);
  return Number.isNaN(parsed) ? 0 : parsed;
})();

interface ProductForDescription {
  id: string;
  name: string;
  brand: string | null;
  price: unknown;
}

interface AiCallResult {
  text: string;
  durationMs: number;
  statusCode?: number;
}

async function aiComplete(prompt: string, correlationId: string): Promise<AiCallResult> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model_tier: 'free',
      user_prompt: prompt,
      max_tokens: 300,
      correlation_id: correlationId,
    });
    const endpoint = new URL('/ai/complete', AI_URL);
    const requestLib = endpoint.protocol === 'https:' ? https : http;
    const startedAt = Date.now();

    const req = requestLib.request(
      {
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: endpoint.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const durationMs = Date.now() - startedAt;
          try {
            const parsed = JSON.parse(data);
            const text = (parsed.text ?? parsed.content ?? parsed.result ?? '').toString().trim();
            resolve({ text, durationMs, statusCode: res.statusCode });
          } catch {
            reject(new Error(`AI parse error (status ${res.statusCode ?? 'unknown'}): ${data.slice(0, 300)}`));
          }
        });
      },
    );

    req.on('error', (error) => {
      reject(error);
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  const logger = new Logger({ serviceName: 'flipflop-description-generator' });
  const prisma = new PrismaClient();
  const startedAt = Date.now();

  try {
    const where = { OR: [{ description: null }, { description: '' }] };
    const totalMissing = await prisma.product.count({ where });
    const products = (await prisma.product.findMany({
      where,
      select: { id: true, name: true, brand: true, price: true },
      take: LIMIT > 0 ? LIMIT : undefined,
      orderBy: { createdAt: 'asc' },
    })) as ProductForDescription[];

    await logger.info('Description generation started', {
      timestamp: new Date().toISOString(),
      dry_run: DRY_RUN,
      limit: LIMIT,
      ai_url: AI_URL,
      total_missing: totalMissing,
      processing_count: products.length,
    });

    // eslint-disable-next-line no-console
    console.log(
      `Products needing descriptions: ${totalMissing} total, processing ${products.length}${DRY_RUN ? ' (DRY RUN)' : ''}`,
    );

    let ok = 0;
    let fail = 0;

    for (const product of products) {
      const correlationId = `desc-gen-${product.id}-${Date.now()}`;
      const prompt = `Napiš stručný prodejní popis produktu v češtině (max 120 slov). Produkt: "${product.name}"${product.brand ? `, značka: ${product.brand}` : ''}${product.price ? `, cena: ${product.price} Kč` : ''}. Bez nadpisů, pouze text popisu.`;
      const itemStartedAt = Date.now();

      await logger.info('Generating description for product', {
        timestamp: new Date().toISOString(),
        product_id: product.id,
        product_name: product.name,
        correlation_id: correlationId,
      });

      try {
        const aiResult = await aiComplete(prompt, correlationId);
        if (!aiResult.text) {
          throw new Error('AI returned empty description');
        }

        if (DRY_RUN) {
          // eslint-disable-next-line no-console
          console.log(`[DRY] ${product.name}: ${aiResult.text.slice(0, 80)}...`);
        } else {
          await prisma.product.update({
            where: { id: product.id },
            data: { description: aiResult.text },
          });
          // eslint-disable-next-line no-console
          console.log(`[OK] ${product.name}`);
        }

        ok += 1;
        await logger.info('Description generation succeeded', {
          timestamp: new Date().toISOString(),
          product_id: product.id,
          product_name: product.name,
          correlation_id: correlationId,
          ai_duration_ms: aiResult.durationMs,
          total_item_duration_ms: Date.now() - itemStartedAt,
          ai_status_code: aiResult.statusCode,
          dry_run: DRY_RUN,
        });
      } catch (error) {
        fail += 1;
        const message = error instanceof Error ? error.message : 'Unknown error';
        // eslint-disable-next-line no-console
        console.error(`[FAIL] ${product.name}: ${message}`);
        await logger.error('Description generation failed', {
          timestamp: new Date().toISOString(),
          product_id: product.id,
          product_name: product.name,
          correlation_id: correlationId,
          total_item_duration_ms: Date.now() - itemStartedAt,
          error_message: message,
        });
      }
    }

    const totalDurationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`\nDone: ${ok} ok, ${fail} failed`);
    await logger.info('Description generation finished', {
      timestamp: new Date().toISOString(),
      success_count: ok,
      fail_count: fail,
      total_duration_ms: totalDurationMs,
      dry_run: DRY_RUN,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
