import EmbeddedPostgres from 'embedded-postgres';
import { Pool } from 'pg';
import { mkdir, mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import type { RpcTransport } from '@/lib/persistence/contracts';

export async function postgresFixture() {
  // Test-owned cluster only. Never use an existing developer/remote database.
  await mkdir(resolve('.local/foundation-tests'), { recursive: true });
  const dir = await mkdtemp(resolve('.local/foundation-tests/pg-'));
  await writeFile(resolve(dir, 'test-owned.marker'), 'foundation-test');
  const port = await new Promise<number>((ok, fail) => {
    const server = createServer(); server.on('error', fail);
    server.listen(0, '127.0.0.1', () => { const address = server.address(); if (typeof address !== 'object' || !address) throw Error('port'); const port = address.port; server.close(() => ok(port)); });
  });
  const password = randomBytes(24).toString('hex'); // synthetic ephemeral fixture only
  const pg = new EmbeddedPostgres({ databaseDir: resolve(dir, 'data'), port, user: 'postgres', password,
    persistent: true, initdbFlags: ['--locale=C', '--encoding=UTF8'],
    postgresFlags: ['-h', '127.0.0.1'], onLog: () => {}, onError: message => console.error('[test-pg]', message) });
  await pg.initialise();
  // On Windows pg_ctl drops elevated privileges; launching postgres.exe directly
  // from an Administrator shell is refused. No OS account/configuration changes.
  let stop = () => pg.stop();
  let start = () => pg.start();
  if (process.platform === 'win32') {
    const platformPackage = '@embedded-postgres/windows-x64';
    const { pg_ctl } = await import(/* @vite-ignore */ platformPackage);
    const run = (args: string[]) => new Promise<void>((ok, fail) => {
      const child = spawn(pg_ctl, args, { stdio: 'ignore', windowsHide: true });
      child.once('error', fail); child.once('exit', code => code === 0 ? ok() : fail(Error(`test pg_ctl exit ${code}`)));
    });
    start = () => run(['start', '-D', resolve(dir, 'data'), '-l', resolve(dir, 'postgres.log'), '-w', '-t', '30', '-o', `-h 127.0.0.1 -p ${port}`]);
    await start();
    stop = () => run(['stop', '-D', resolve(dir, 'data'), '-w', '-t', '30', '-m', 'fast']);
  } else { await pg.start(); }
  const pool = new Pool({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres', max: 16 });
  pool.on('error', () => { /* An intentional test restart disconnects idle clients. */ });
  // Minimal Supabase role/auth.uid compatibility in this LOCAL test DB only.
  await pool.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, service_role, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, service_role, anon;`);
  for (const name of (await readdir(resolve('supabase/migrations'))).filter(name => name.endsWith('.sql')).sort()) {
    await pool.query(await readFile(resolve('supabase/migrations', name), 'utf8'));
  }
  const rpc: RpcTransport = { async rpc(name, args) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE service_role');
      const names = Object.keys(args);
      if (!['edu_bind_owner', 'edu_foundation'].includes(name)) throw Error('test RPC allowlist');
      const result = await client.query(`SELECT public.${name}(${names.map((n, i) => `${n} => $${i + 1}`).join(',')}) AS data`, Object.values(args));
      await client.query('COMMIT'); return { data: result.rows[0].data, error: null };
    } catch (error) {
      await client.query('ROLLBACK'); const e = error as { code?: string; message: string };
      return { data: null, error: { code: e.code, message: e.message } };
    } finally { client.release(); }
  } };
  return { pool, rpc, port, async restart() { await stop(); await start(); }, async close() {
    await pool.end(); await stop();
    if (await readFile(resolve(dir, 'test-owned.marker'), 'utf8') !== 'foundation-test') throw Error('refuse cleanup');
    await rm(dir, { recursive: true });
  } };
}
