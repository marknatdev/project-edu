// DEF-01 browser-verification harness ONLY. Not shipped, not a Supabase
// replacement. A test-owned local PostgreSQL 17 cluster runs the repository's
// actual supabase/migrations; this tiny HTTP server forwards supabase-js
// `client.rpc()` calls (POST /rest/v1/rpc/<name>) to the same SQL functions as
// service_role, like PostgREST would. Hosted PostgREST/JWT/RLS remain unverified.
//
// Env (all synthetic, generated per run by the Python runner, never real keys):
//   SHIM_DATA_DIR, SHIM_PG_PORT, SHIM_HTTP_PORT, SHIM_PG_PASSWORD,
//   SHIM_SERVICE_KEY (expected apikey), SHIM_CONTROL_TOKEN.
// `node rest-shim.mjs init` creates the cluster + schema; `serve` (default)
// starts the existing cluster (restart-safe) and serves until /__control/stop.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const env = name => { const v = process.env[name]; if (!v) throw Error('missing ' + name); return v; };
const DATA = env('SHIM_DATA_DIR'), PG_PORT = Number(env('SHIM_PG_PORT')), HTTP_PORT = Number(env('SHIM_HTTP_PORT'));
const PASSWORD = env('SHIM_PG_PASSWORD'), SERVICE_KEY = env('SHIM_SERVICE_KEY'), CONTROL = env('SHIM_CONTROL_TOKEN');
const mode = process.argv[2] ?? 'serve';
const exists = p => access(p).then(() => true, () => false);

async function pgCtl(args) {
  if (process.platform !== 'win32') throw Error('harness written for the Windows verification host');
  const { pg_ctl } = await import('@embedded-postgres/windows-x64');
  await new Promise((ok, fail) => {
    const child = spawn(pg_ctl, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', fail); child.once('exit', code => code === 0 ? ok() : fail(Error('pg_ctl exit ' + code)));
  });
}
const start = () => pgCtl(['start', '-D', resolve(DATA, 'data'), '-l', resolve(DATA, 'postgres.log'), '-w', '-t', '30', '-o', `-h 127.0.0.1 -p ${PG_PORT}`]);
const stop = () => pgCtl(['stop', '-D', resolve(DATA, 'data'), '-w', '-t', '30', '-m', 'fast']);

if (mode === 'init') {
  if (await exists(resolve(DATA, 'data'))) throw Error('refusing to re-initialise an existing cluster');
  await writeFile(resolve(DATA, 'test-owned.marker'), 'def01-browser');
  const cluster = new EmbeddedPostgres({ databaseDir: resolve(DATA, 'data'), port: PG_PORT, user: 'postgres', password: PASSWORD,
    persistent: true, initdbFlags: ['--locale=C', '--encoding=UTF8'], onLog: () => {}, onError: () => {} });
  await cluster.initialise();
  await start();
  const pool = new pg.Pool({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: PASSWORD, database: 'postgres' });
  // Same minimal Supabase role/auth.uid compatibility as tests/support/postgres.ts (LOCAL test DB only).
  await pool.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role, anon;`);
  const migrations = (await readdir(resolve(ROOT, 'supabase/migrations'))).filter(n => n.endsWith('.sql')).sort();
  for (const name of migrations) await pool.query(await readFile(resolve(ROOT, 'supabase/migrations', name), 'utf8'));
  await pool.end(); await stop();
  console.log('INIT OK migrations=' + migrations.join(','));
  process.exit(0);
}

await start();
const pool = new pg.Pool({ host: '127.0.0.1', port: PG_PORT, user: 'postgres', password: PASSWORD, database: 'postgres', max: 16 });
pool.on('error', () => {});
const ALLOWED = new Set(['edu_bind_owner', 'edu_foundation']);
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
const server = createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const url = new URL(req.url, 'http://127.0.0.1');
  try {
    if (url.pathname.startsWith('/__control/')) {
      if (req.headers['x-control-token'] !== CONTROL) return send(res, 403, { error: 'forbidden' });
      if (url.pathname === '/__control/rate') {
        // Copy of def01-cloud/rest-shim.mjs; only change: also report 'cards' admission windows (kind column).
        const { rows } = await pool.query(`SELECT split_part(bucket, ':', 1) AS kind, bucket LIKE '%:global' AS global, used, extract(epoch FROM expires_at - now())::float AS seconds_left
          FROM public.edu_rate_windows WHERE (bucket LIKE 'coach:%' OR bucket LIKE 'cards:%') AND expires_at > now()`);
        return send(res, 200, rows);
      }
      if (url.pathname === '/__control/stop') {
        send(res, 200, { stopping: true });
        server.close(); await pool.end(); await stop(); process.exit(0);
      }
      return send(res, 404, {});
    }
    const match = /^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
    if (req.method !== 'POST' || !match || !ALLOWED.has(match[1])) return send(res, 404, { code: 'PGRST202', message: 'not found' });
    if (req.headers.apikey !== SERVICE_KEY) return send(res, 401, { code: 'PGRST301', message: 'invalid key' });
    const args = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    const names = Object.keys(args);
    if (!names.every(n => /^p_[a-z]+$/.test(n))) return send(res, 400, { code: 'PGRST100', message: 'bad args' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE service_role');
      const values = names.map(n => (args[n] !== null && typeof args[n] === 'object') ? JSON.stringify(args[n]) : args[n]);
      const result = await client.query(`SELECT public.${match[1]}(${names.map((n, i) => `${n} => $${i + 1}`).join(',')}) AS data`, values);
      await client.query('COMMIT');
      return send(res, 200, result.rows[0].data);
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      return send(res, 400, { code: error.code ?? 'XX000', message: 'rpc failed' });
    } finally { client.release(); }
  } catch { return send(res, 503, { code: 'PGRST000', message: 'unavailable' }); }
});
server.listen(HTTP_PORT, '127.0.0.1', () => console.log('SHIM READY http=' + HTTP_PORT + ' pg=' + PG_PORT));
