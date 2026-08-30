import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, isValidSession } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const session = request.cookies.get(COOKIE_NAME)?.value;
  if (isValidSession(session)) return NextResponse.next();

  // Clone nextUrl (not a plain `new URL()`) so the redirect stays basePath-aware
  // — this app is proxied under navazano.cz/stock via next.config.mjs's basePath.
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
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
