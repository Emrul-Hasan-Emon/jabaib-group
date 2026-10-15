import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './orm-config';

/** CLI DataSource for migrations: `npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts` */
export const dataSource = new DataSource(
  buildDataSourceOptions({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_DATABASE ?? 'jabaib',
  }),
);
