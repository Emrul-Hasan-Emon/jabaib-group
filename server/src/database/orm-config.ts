import * as path from 'node:path';
import type { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

export interface DatabaseConnectionOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

/**
 * Shared options for both the Nest runtime DataSource and the CLI
 * DataSource in data-source.ts. `synchronize` is always false — schema
 * changes go through migrations.
 */
export function buildDataSourceOptions(
  connection: DatabaseConnectionOptions,
): DataSourceOptions {
  return {
    type: 'postgres',
    ...connection,
    entities: [...ENTITIES],
    migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
