// next.config.mjs sets basePath: '/stock' (this app is proxied under
// navazano.cz/stock). Next's own router/<Link>/static assets pick that up
// automatically, but a plain fetch() to a root-relative path does not, so
// every client-side API call goes through this wrapper instead.
const BASE_PATH = '/stock';

// This app's data changes on every action (stock, settings, sales), so
// nothing here should ever be served from a browser/edge cache — default to
// no-store, but let a caller override it if it ever needs to.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, { cache: 'no-store', ...init });
}
