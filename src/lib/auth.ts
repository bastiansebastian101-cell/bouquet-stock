// Uses the Web Crypto API (globalThis.crypto.subtle), not Node's `crypto`
// module — this file is imported by middleware.ts, which runs in the Edge
// Runtime and doesn't support Node built-ins. Web Crypto works fine in both
// the Edge Runtime and the Node.js runtime (the login API route), so one
// implementation covers both call sites.
const COOKIE_NAME = 'stock_session';

export async function getExpectedToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const data = new TextEncoder().encode(password + 'bouquet_stock_salt');
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  const expected = await getExpectedToken();
  if (!expected || !cookieValue) return false;
  return cookieValue === expected;
}

export { COOKIE_NAME };
