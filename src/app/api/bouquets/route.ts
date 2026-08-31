import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeSaleResult } from '@/lib/profit';

interface IncomingFlower {
  flowerId: string;
  quantity: number;
}

// See channel-settings/route.ts — no dynamic function/param usage in GET
// means Next.js could otherwise statically cache it and serve stale history.
export const dynamic = 'force-dynamic';

const KNOWN_CHANNELS = ['website', 'bolt', 'wolt', 'foodora'];

// Returns [] (not null) when flowers is omitted entirely — that's the
// signal for a manually-priced "quick product" that isn't built from stock
// (see the manualCostCzk handling in POST below). null means malformed input.
function parseFlowers(body: { flowers?: unknown }): IncomingFlower[] | null {
  if (body.flowers === undefined || body.flowers === null) return [];
  if (!Array.isArray(body.flowers) || body.flowers.length === 0) return null;
  const parsed: IncomingFlower[] = [];
  for (const f of body.flowers) {
    if (
      typeof f !== 'object' ||
      f === null ||
      typeof (f as IncomingFlower).flowerId !== 'string' ||
      !Number.isInteger((f as IncomingFlower).quantity) ||
      (f as IncomingFlower).quantity <= 0
    ) {
      return null;
    }
    parsed.push({ flowerId: (f as IncomingFlower).flowerId, quantity: (f as IncomingFlower).quantity });
  }
  return parsed;
}

export async function GET() {
  const bouquets = await prisma.bouquet.findMany({
    orderBy: { createdAt: 'desc' },
    include: { flowers: { include: { flower: true } } },
  });
  return NextResponse.json({ bouquets });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  const wrapCostCzk =
    body.wrapCostCzk === undefined || body.wrapCostCzk === null
      ? 0
      : Number.isInteger(body.wrapCostCzk) && body.wrapCostCzk >= 0
        ? body.wrapCostCzk
        : undefined;
  if (wrapCostCzk === undefined) {
    return NextResponse.json({ error: 'invalid_wrap_cost' }, { status: 400 });
  }

  const flowers = parseFlowers(body);
  if (!flowers) {
    return NextResponse.json({ error: 'invalid_flowers' }, { status: 400 });
  }

  // No flowers means this is a manually-priced product (e.g. something sold
  // that isn't built from the flower price book) — it needs an explicit cost
  // instead of one computed from stock.
  let manualCostCzk: number | undefined;
  if (flowers.length === 0) {
    if (!Number.isInteger(body.costCzk) || body.costCzk < 0) {
      return NextResponse.json({ error: 'invalid_cost' }, { status: 400 });
    }
    manualCostCzk = body.costCzk;
  }

  // Optional "recorded as sold" info — only trusted as far as the channel
  // name and sale price; commission/VAT/profit are always recomputed
  // server-side from the channel's real current settings, never taken from
  // the client, same discipline as never trusting a client-submitted price.
  let soldChannel: string | null = null;
  let salePriceCzk: number | null = null;
  let adSpendCzk = 0;
  if (body.soldChannel !== undefined && body.soldChannel !== null) {
    if (typeof body.soldChannel !== 'string' || !KNOWN_CHANNELS.includes(body.soldChannel)) {
      return NextResponse.json({ error: 'invalid_channel' }, { status: 400 });
    }
    if (!Number.isInteger(body.salePriceCzk) || body.salePriceCzk <= 0) {
      return NextResponse.json({ error: 'invalid_sale_price' }, { status: 400 });
    }
    soldChannel = body.soldChannel;
    salePriceCzk = body.salePriceCzk;
    if (body.adSpendCzk !== undefined && body.adSpendCzk !== null) {
      if (!Number.isInteger(body.adSpendCzk) || body.adSpendCzk < 0) {
        return NextResponse.json({ error: 'invalid_ad_spend' }, { status: 400 });
      }
      adSpendCzk = body.adSpendCzk;
    }
  }

  try {
    const bouquet = await prisma.$transaction(async (tx) => {
      // Re-check stock server-side (never trust the client's displayed numbers)
      // and decrement it atomically as part of saving the bouquet. Skipped
      // entirely for a manually-priced product (no flowers involved).
      let costCzk: number;
      if (flowers.length > 0) {
        let flowerCostCzk = 0;
        for (const f of flowers) {
          const flower = await tx.flower.findUnique({ where: { id: f.flowerId } });
          if (!flower || flower.stockQuantity < f.quantity) {
            throw new Error('insufficient_stock');
          }
          flowerCostCzk += flower.priceCzk * f.quantity;
        }
        costCzk = flowerCostCzk + wrapCostCzk;
      } else {
        costCzk = manualCostCzk! + wrapCostCzk;
      }

      let payoutCzk: number | null = null;
      let profitCzk: number | null = null;
      if (soldChannel && salePriceCzk !== null) {
        const channel = await tx.channelSetting.findUnique({ where: { name: soldChannel } });
        if (channel) {
          const result = computeSaleResult(salePriceCzk, channel.commissionPercent, channel.vatEnabled, costCzk, adSpendCzk);
          payoutCzk = result.payoutCzk;
          profitCzk = result.profitCzk;
        }
      }

      const created = await tx.bouquet.create({
        data: {
          name: body.name.trim(),
          wrapCostCzk,
          costCzk,
          soldChannel,
          salePriceCzk,
          adSpendCzk: soldChannel ? adSpendCzk : null,
          payoutCzk,
          profitCzk,
          soldAt: soldChannel ? new Date() : null,
          flowers: { create: flowers.map((f) => ({ flowerId: f.flowerId, quantity: f.quantity })) },
        },
        include: { flowers: { include: { flower: true } } },
      });

      for (const f of flowers) {
        await tx.flower.update({
          where: { id: f.flowerId },
          data: { stockQuantity: { decrement: f.quantity } },
        });
      }

      return created;
    });

    return NextResponse.json({ bouquet });
  } catch (e) {
    if (e instanceof Error && e.message === 'insufficient_stock') {
      return NextResponse.json({ error: 'insufficient_stock' }, { status: 409 });
    }
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
