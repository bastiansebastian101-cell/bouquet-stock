import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const data: {
    name?: string;
    priceCzk?: number;
    stockQuantity?: number;
    color?: string | null;
    imageUrl?: string | null;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.priceCzk !== undefined) {
    if (!Number.isInteger(body.priceCzk) || body.priceCzk < 0) {
      return NextResponse.json({ error: 'invalid_price' }, { status: 400 });
    }
    data.priceCzk = body.priceCzk;
  }
  if (body.stockQuantity !== undefined) {
    if (!Number.isInteger(body.stockQuantity) || body.stockQuantity < 0) {
      return NextResponse.json({ error: 'invalid_stock' }, { status: 400 });
    }
    data.stockQuantity = body.stockQuantity;
  }
  if (body.color !== undefined) {
    data.color = typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null;
  }
  if (body.imageUrl !== undefined) {
    data.imageUrl = typeof body.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  }

  try {
    const flower = await prisma.flower.update({ where: { id: params.id }, data });
    return NextResponse.json({ flower });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.flower.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2003') {
        return NextResponse.json({ error: 'flower_in_use' }, { status: 409 });
      }
      if (e.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'delete_failed' }, { status: 500 });
  }
}
