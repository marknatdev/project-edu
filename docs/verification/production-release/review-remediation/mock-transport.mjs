// TEST ONLY. Synthetic HTTPS upstream transport, never loaded by shipped app.
const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(String(input));
  if (url.origin === 'http://127.0.0.1:55554' && url.pathname === '/auth/v1/user') {
    const token = new Headers(init?.headers).get('authorization')?.split(' ')[1] ?? '';
    if (!token.endsWith('.synthetic')) return Promise.resolve(Response.json({ msg: 'synthetic Auth denied' }, { status: 401 }));
    const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Promise.resolve(Response.json({ id: claims.sub, aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'google' }, user_metadata: {}, created_at: '2026-11-01T00:00:00Z' }));
  }
  if (url.origin === 'https://mock-upstream.invalid') return realFetch('http://127.0.0.1:55555' + url.pathname, init);
  return realFetch(input, init);
};
