import { defineConfig } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: './.env' });
export default defineConfig({
  pool: { max: 50 },
  host: process.env.MYSQL_HOST,
  port: 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  dbName: process.env.MYSQL_DB,
  baseDir: process.cwd(),
  entities: ['dist/**/*.entity.js'],
  migrations:
    process.env.MAZA_ENV === 'production'
      ? { path: join(process.cwd(), 'dist/migrations') }
      : undefined,
  charset: 'utf8mb4',
  collate: 'utf8mb4_general_ci',
  extensions: [Migrator],
  debug: process.env.MAZA_ENV === 'development',
});
