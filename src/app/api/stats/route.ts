import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Total inventory value is always the current live snapshot (sum of stock on
// hand right now) — there's no historical "inventory at date X" tracking, so
// it doesn't change with the period filter below, only Loss and Profit do.
function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week': {
      const day = now.getDay(); // 0=Sun..6=Sat
      const diffToMonday = (day + 6) % 7;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get('period') ?? 'today';
  const periodStart = getPeriodStart(period);

  const flowers = await prisma.flower.findMany({ select: { priceCzk: true, stockQuantity: true } });
  const totalInventoryCzk = flowers.reduce((sum, f) => sum + f.priceCzk * f.stockQuantity, 0);
  const totalStockQuantity = flowers.reduce((sum, f) => sum + f.stockQuantity, 0);

  const wasteAgg = await prisma.wasteEntry.aggregate({
    where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
    _sum: { costCzk: true },
  });

  const profitAgg = await prisma.bouquet.aggregate({
    where: {
      profitCzk: { not: null },
      ...(periodStart ? { createdAt: { gte: periodStart } } : {}),
    },
    _sum: { profitCzk: true },
  });

  return NextResponse.json({
    period,
    totalInventoryCzk,
    totalStockQuantity,
    totalLossCzk: wasteAgg._sum.costCzk ?? 0,
    totalProfitCzk: profitAgg._sum.profitCzk ?? 0,
  });
}
