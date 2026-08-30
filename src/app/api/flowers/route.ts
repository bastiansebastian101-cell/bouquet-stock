import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const flowers = await prisma.flower.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({ flowers });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (!Number.isInteger(body.priceCzk) || body.priceCzk < 0) {
    return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
  }
  const stockQuantity =
    body.stockQuantity === undefined || body.stockQuantity === null
      ? 0
      : Number.isInteger(body.stockQuantity) && body.stockQuantity >= 0
        ? body.stockQuantity
        : undefined;
  if (stockQuantity === undefined) {
    return NextResponse.json({ error: 'invalid_stock' }, { status: 400 });
  }

  try {
    const flower = await prisma.flower.create({
      data: {
        name: body.name.trim(),
        priceCzk: body.priceCzk,
        stockQuantity,
        color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null,
        imageUrl: typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null,
      },
    });
    return NextResponse.json({ flower });
  } catch {
    return NextResponse.json({ error: 'name_taken' }, { status: 409 });
  }
}
