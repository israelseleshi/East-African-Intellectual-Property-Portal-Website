// Database connection - Node.js only
import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';

// Priority: Individual env vars (DB_HOST, etc.) take precedence for MySQL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const poolConfig: any = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Only use connection string if explicit variables are missing or if DATABASE_URL is specifically provided
if (!process.env.DB_HOST && process.env.DATABASE_URL) {
  poolConfig.uri = process.env.DATABASE_URL;
}

console.log('Initializing DB Pool with host:', poolConfig.host || 'Remote URI');

export const pool: Pool = mysql.createPool({
  ...poolConfig,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Minimal DB bootstrap so dev/prod don't fail hard if a table was missed during manual SQL setup.
// Uses IF NOT EXISTS so it is safe to run repeatedly.
export const ensureAuthTables = async () => {
  // users.id is CHAR(36) in this project, so the FK column must match exactly.
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_refresh_tokens (
      id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_refresh_user (user_id),
      CONSTRAINT fk_user_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

type MetricBucket = {
  count: number;
  over200ms: number;
  totalMs: number;
};

const queryMetrics: Record<string, MetricBucket> = {};

const recordMetric = (label: string, durationMs: number) => {
  if (!queryMetrics[label]) {
    queryMetrics[label] = { count: 0, over200ms: 0, totalMs: 0 };
  }
  queryMetrics[label].count += 1;
  queryMetrics[label].totalMs += durationMs;
  if (durationMs > 200) {
    queryMetrics[label].over200ms += 1;
  }
};

export const query = async (sql: string, params?: unknown[]) => {
  let mysqlSql = sql;
  const mysqlParams: unknown[] = [];

  if (params && params.length > 0) {
    let i = 1;
    while (mysqlSql.includes('$' + i)) {
      mysqlSql = mysqlSql.replace('$' + i, '?');
      mysqlParams.push(params[i - 1]);
      i++;
    }
  }

  const started = performance.now();
  const [results] = await pool.execute(mysqlSql as string, (mysqlParams.length > 0 ? mysqlParams : (params || [])) as any[]);
  const duration = performance.now() - started;
  recordMetric('default', duration);
  if (duration > 200) {
    logger.warn('slow-query', { sql: mysqlSql, params: mysqlParams, durationMs: duration });
  }
  return { rows: Array.isArray(results) ? (results as unknown[]) : [results] };
};

export const getConnection = () => pool.getConnection();

export const getQueryMetrics = () =>
  Object.entries(queryMetrics).map(([label, data]) => ({
    label,
    count: data.count,
    over200ms: data.over200ms,
    avgMs: data.count ? Number((data.totalMs / data.count).toFixed(2)) : 0
  }));

export const timedExecute = async (label: string, sql: string, params?: unknown[]) => {
  const started = performance.now();
  const [results] = await pool.execute(sql, params as any[]);
  const duration = performance.now() - started;
  recordMetric(label, duration);
  if (duration > 200) {
    logger.warn('slow-query', { label, sql, params, durationMs: duration });
  }
  return results;
};
