// next.config.mjs sets basePath: '/stock' (this app is proxied under
// navazano.cz/stock). Next's own router/<Link>/static assets pick that up
// automatically, but a plain fetch() to a root-relative path does not, so
// every client-side API call goes through this wrapper instead.
const BASE_PATH = '/stock';

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, init);
}
