// Synthetic tokens/identity ONLY. Never used against a real provider.
export const authUser = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated',
  app_metadata: { provider: 'google' }, user_metadata: { full_name: 'SYNTHETIC NEVER STORE' }, email: 'synthetic@example.invalid', created_at: '2026-11-01T00:00:00Z' };
export function authSession(expired = false) {
  const expires_at = Math.floor(Date.now() / 1000) + (expired ? -120 : 3600);
  const access_token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: authUser.id, exp: expires_at })).toString('base64url'), 'synthetic'].join('.');
  return { access_token, refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_in: expired ? -120 : 3600, expires_at, user: authUser };
}
export function authCookie(expired = false) { return 'sb-ppctndzkerwiokjfaklw-auth-token=base64-' + Buffer.from(JSON.stringify(authSession(expired))).toString('base64url'); }
