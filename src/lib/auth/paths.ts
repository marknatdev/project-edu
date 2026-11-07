const NEXT_PATHS = new Set(['/', '/interview', '/discovery', '/idea', '/evaluation', '/variables', '/proposal', '/bom', '/calendar', '/judge', '/consent']);
/** Exact app-page allowlist; no auth/API targets, schemes, slash/backslash tricks. */
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1024 || !value.startsWith('/') || /[\\\u0000-\u0020]/u.test(value)) return '/';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u0020]/u.test(decoded)) return '/';
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || !NEXT_PATHS.has(url.pathname)) return '/';
    return url.pathname + url.search;
  } catch { return '/'; }
}
/** Never trust forwarded-host to construct OAuth redirects. Configure the exact
 * deployed origin (no guessed Vercel alias). Local dev supports Next host normalization. */
export function appOrigin(req: Request): string {
  if (process.env.APP_ORIGIN) {
    const url = new URL(process.env.APP_ORIGIN);
    if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw Error('AUTH_ORIGIN_UNAVAILABLE');
    if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw Error('AUTH_ORIGIN_UNAVAILABLE');
    return url.origin;
  }
  const url = new URL(req.url);
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') throw Error('AUTH_ORIGIN_UNAVAILABLE');
  const host = req.headers.get('host') ?? url.host;
  const local = new URL(`${url.protocol}//${host}`);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(local.hostname)) throw Error('AUTH_ORIGIN_UNAVAILABLE');
  return local.origin;
}
export function sameOrigin(req: Request, requireOrigin = false): boolean {
  try {
    const origin = req.headers.get('origin');
    return (!requireOrigin && !origin || origin === appOrigin(req)) && req.headers.get('sec-fetch-site') !== 'cross-site';
  } catch { return false; }
}
