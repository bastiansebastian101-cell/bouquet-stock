import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { computeSaleResult } from '@/lib/profit';

// See channel-settings/route.ts — kept consistent across every route that
// reads live, mutable data.
export const dynamic = 'force-dynamic';

const KNOWN_CHANNELS = ['website', 'bolt', 'wolt', 'foodora'];

// Records a sale against an already-saved bouquet (used by the standalone
// "Add Sales Record" page — a bouquet built earlier can be sold later).
// Profit is always recomputed here from the bouquet's stored cost snapshot
// and the channel's live settings, never taken from the client.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();

  if (typeof body.soldChannel !== 'string' || !KNOWN_CHANNELS.includes(body.soldChannel)) {
    return NextResponse.json({ error: 'invalid_channel' }, { status: 400 });
  }
  if (!Number.isInteger(body.salePriceCzk) || body.salePriceCzk <= 0) {
    return NextResponse.json({ error: 'invalid_sale_price' }, { status: 400 });
  }
  let adSpendCzk = 0;
  if (body.adSpendCzk !== undefined && body.adSpendCzk !== null) {
    if (!Number.isInteger(body.adSpendCzk) || body.adSpendCzk < 0) {
      return NextResponse.json({ error: 'invalid_ad_spend' }, { status: 400 });
    }
    adSpendCzk = body.adSpendCzk;
  }

  const bouquet = await prisma.bouquet.findUnique({ where: { id: params.id } });
  if (!bouquet) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (bouquet.soldChannel) {
    return NextResponse.json({ error: 'already_sold' }, { status: 409 });
  }

  const channel = await prisma.channelSetting.findUnique({ where: { name: body.soldChannel } });
  if (!channel || !channel.enabled) {
    return NextResponse.json({ error: 'channel_unavailable' }, { status: 400 });
  }

  const { payoutCzk, profitCzk } = computeSaleResult(
    body.salePriceCzk,
    channel.commissionPercent,
    channel.vatEnabled,
    bouquet.costCzk,
    adSpendCzk
  );

  const updated = await prisma.bouquet.update({
    where: { id: params.id },
    data: {
      soldChannel: body.soldChannel,
      salePriceCzk: body.salePriceCzk,
      adSpendCzk,
      payoutCzk,
      profitCzk,
      soldAt: new Date(),
    },
  });

  return NextResponse.json({ bouquet: updated });
}
