import crypto from 'crypto';

const COOKIE_NAME = 'stock_session';

export function getExpectedToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return crypto.createHash('sha256').update(password + 'bouquet_stock_salt').digest('hex');
}

export function isValidSession(cookieValue: string | undefined): boolean {
  const expected = getExpectedToken();
  if (!expected || !cookieValue) return false;
  return cookieValue === expected;
}

export { COOKIE_NAME };
