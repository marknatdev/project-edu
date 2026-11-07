/** Non-authorizing provenance label. The server verifies the principal afresh
 * and rejects a stale/mismatching workspace before persistence/quota effects. */
let scope = 'guest';
export const getWorkspaceScope = () => scope;
export function setWorkspaceScope(next: string) {
  if (next !== 'guest' && !/^account:[a-f0-9]{64}$/.test(next)) throw Error('INVALID_WORKSPACE');
  scope = next;
}
export function appFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('x-edu-workspace', scope);
  return fetch(input, { ...init, headers });
}
/** Single seam for scope-change reloads (tests substitute it). */
export const reloadWorkspace = () => window.location.reload();
