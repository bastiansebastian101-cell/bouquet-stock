import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, isValidSession } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (isValidSession(session)) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login (the login page itself)
     * - /api/login (the login submit endpoint)
     * - static assets and Next.js internals
     */
    '/((?!login|api/login|_next/static|_next/image|favicon.ico|flower-images).*)',
  ],
};
