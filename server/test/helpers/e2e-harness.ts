/**
 * E2E harness — Phase 7 admin testing.
 *
 * Jest 30 on Node < 24.9 cannot require() the ESM-only @nestjs/* packages the
 * app imports, so we do NOT boot AppModule in-process. Instead each spec:
 *   1. creates the dedicated `jabaib_test` database,
 *   2. synchronizes its schema straight from the entities (dropSchema),
 *   3. seeds fixtures through a programmatic TypeORM DataSource,
 *   4. spawns the compiled `dist/main.js` on a free port pointed at that DB,
 *   5. runs real HTTP assertions against it.
 */
import 'dotenv/config';
import { spawn, type ChildProcess } from 'node:child_process';
import * as net from 'node:net';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { buildDataSourceOptions } from '../../src/database/orm-config';

export const TEST_DB = process.env.TEST_DB ?? 'jabaib_test';

const SERVER_DIR = process.env.SERVER_DIR ?? process.cwd();

export function testDbConnection() {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: TEST_DB,
  };
}

/** Create the dedicated test database if it does not exist yet. */
export async function ensureTestDatabase() {
  const maintenance = new DataSource(
    buildDataSourceOptions({ ...testDbConnection(), database: 'postgres' }),
  );
  await maintenance.initialize();
  try {
    const rows = await maintenance.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB],
    );
    if (rows.length === 0) {
      await maintenance.query(`CREATE DATABASE ${TEST_DB}`);
    }
  } finally {
    await maintenance.destroy();
  }
}

/**
 * Recreate the schema from the CURRENT entities (synchronize + dropSchema),
 * mirroring the dev database exactly and sidestepping stale migrations.
 */
export async function syncTestDatabase() {
  const ds = new DataSource({
    ...buildDataSourceOptions(testDbConnection()),
    synchronize: true,
    dropSchema: true,
  });
  await ds.initialize();
  await ds.destroy();
}

/** Open a raw connection to the test database for seeding fixtures. */
export async function openTestDataSource() {
  const ds = new DataSource(buildDataSourceOptions(testDbConnection()));
  await ds.initialize();
  return ds;
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = (srv.address() as net.AddressInfo).port;
      srv.close(() => resolve(port));
    });
  });
}

export interface TestServer {
  baseUrl: string;
  child: ChildProcess;
  stop: () => Promise<void>;
}

/** Spawn the compiled app on a free port and wait until it serves requests. */
export async function bootServer(port: number): Promise<TestServer> {
  const child = spawn('node', ['dist/main.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      DB_DATABASE: TEST_DB,
      TYPEORM_LOGGING: 'false',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout?.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    logs += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(
        `Test server exited early (code ${child.exitCode}):\n${logs}`,
      );
    }
    try {
      const res = await request(baseUrl).get('/');
      if (res.status === 200) break;
    } catch {
      // Not up yet — keep polling.
    }
    if (Date.now() > deadline) {
      throw new Error(`Test server did not become ready:\n${logs}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return {
    baseUrl,
    child,
    stop: async () => {
      if (child.exitCode === null) child.kill('SIGTERM');
    },
  };
}

export interface ApiResult {
  status: number;
  body: any;
}

/** Thin wrapper around supertest for absolute-URL HTTP calls. */
export async function api(
  baseUrl: string,
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  token: string | null,
  payload?: unknown,
): Promise<ApiResult> {
  const req = (request(baseUrl) as any)[method](path) as request.Test;
  if (token) req.set('Authorization', `Bearer ${token}`);
  if (payload !== undefined) req.send(payload as object);
  const res = await req;
  return { status: res.status, body: res.body };
}

export async function adminLogin(
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const res = await api(baseUrl, 'post', '/v1/admin/auth/login', null, {
    email,
    password,
  });
  if (res.status !== 200 || !res.body?.accessToken) {
    throw new Error(
      `Admin login failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body.accessToken as string;
}

/** Extract an entity id tolerating `{ id }` vs `{ data: { id } }` responses. */
export function entityId(body: any): number {
  return Number(body?.id ?? body?.data?.id);
}
