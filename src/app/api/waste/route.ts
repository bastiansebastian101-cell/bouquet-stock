import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const entries = await prisma.wasteEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: { flower: true },
  });
  return NextResponse.json({ entries });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.flowerId !== 'string' || !body.flowerId) {
    return NextResponse.json({ error: 'invalid_flower' }, { status: 400 });
  }
  if (!Number.isInteger(body.quantity) || body.quantity <= 0) {
    return NextResponse.json({ error: 'invalid_quantity' }, { status: 400 });
  }

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const flower = await tx.flower.findUnique({ where: { id: body.flowerId } });
      if (!flower) throw new Error('not_found');
      if (flower.stockQuantity < body.quantity) throw new Error('insufficient_stock');

      const created = await tx.wasteEntry.create({
        data: {
          flowerId: body.flowerId,
          quantity: body.quantity,
          costCzk: flower.priceCzk * body.quantity,
        },
        include: { flower: true },
      });

      await tx.flower.update({
        where: { id: body.flowerId },
        data: { stockQuantity: { decrement: body.quantity } },
      });

      return created;
    });

    return NextResponse.json({ entry });
  } catch (e) {
    if (e instanceof Error && e.message === 'not_found') {
      return NextResponse.json({ error: 'flower_not_found' }, { status: 404 });
    }
    if (e instanceof Error && e.message === 'insufficient_stock') {
      return NextResponse.json({ error: 'insufficient_stock' }, { status: 409 });
    }
    return NextResponse.json({ error: 'save_failed' }, { status: 500 });
  }
}
