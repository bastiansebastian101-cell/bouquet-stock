import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { name: string } }) {
  const body = await request.json();
  const data: { commissionPercent?: number; enabled?: boolean; vatEnabled?: boolean } = {};

  if (body.commissionPercent !== undefined) {
    if (!Number.isInteger(body.commissionPercent) || body.commissionPercent < 0 || body.commissionPercent > 100) {
      return NextResponse.json({ error: 'invalid_commission' }, { status: 400 });
    }
    data.commissionPercent = body.commissionPercent;
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: 'invalid_enabled' }, { status: 400 });
    }
    data.enabled = body.enabled;
  }
  if (body.vatEnabled !== undefined) {
    if (typeof body.vatEnabled !== 'boolean') {
      return NextResponse.json({ error: 'invalid_vat_enabled' }, { status: 400 });
    }
    data.vatEnabled = body.vatEnabled;
  }

  try {
    const channel = await prisma.channelSetting.update({ where: { name: params.name }, data });
    return NextResponse.json({ channel });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
