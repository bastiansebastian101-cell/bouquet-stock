import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getExpectedToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { password } = body;

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required.' }, { status: 400 });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const expectedToken = getExpectedToken();
  if (!adminPassword || !expectedToken) {
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, expectedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
