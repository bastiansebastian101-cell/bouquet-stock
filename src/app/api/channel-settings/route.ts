import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULTS: { name: string; commissionPercent: number; enabled: boolean }[] = [
  { name: 'website', commissionPercent: 0, enabled: true },
  { name: 'bolt', commissionPercent: 30, enabled: true },
  { name: 'wolt', commissionPercent: 24, enabled: true },
  { name: 'foodora', commissionPercent: 21, enabled: true },
];

export async function GET() {
  const existing = await prisma.channelSetting.findMany();
  const existingNames = new Set(existing.map((c) => c.name));

  const missing = DEFAULTS.filter((d) => !existingNames.has(d.name));
  if (missing.length > 0) {
    await prisma.channelSetting.createMany({ data: missing });
  }

  const channels = await prisma.channelSetting.findMany();
  // Keep a stable, sensible display order regardless of DB insertion order.
  const order = ['website', 'bolt', 'wolt', 'foodora'];
  channels.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));

  return NextResponse.json({ channels });
}
