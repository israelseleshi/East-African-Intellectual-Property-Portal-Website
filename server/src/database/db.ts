import mysql from 'mysql2/promise';
import type { Pool, PoolOptions } from 'mysql2/promise';
import { performance } from 'perf_hooks';
import { logger } from '../utils/logger.js';

const poolConfig: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306'),
  connectTimeout: 30000,
};

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

export const ensureAuthTables = async () => {
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

type SqlParam = string | number | bigint | boolean | Date | null;
type SqlParamList = SqlParam[];

export const query = async (sql: string, params?: unknown[]) => {
  let mysqlSql = sql;
  const mysqlParams: SqlParamList = [];

  if (params && params.length > 0) {
    let i = 1;
    while (mysqlSql.includes('$' + i)) {
      mysqlSql = mysqlSql.replace('$' + i, '?');
      mysqlParams.push(normalizeParam(params[i - 1]));
      i++;
    }
  }

  const finalParams: SqlParamList =
    mysqlParams.length > 0 ? mysqlParams : (params as SqlParamList | undefined ?? []).map(normalizeParam);
  const started = performance.now();
  const [results] = await pool.execute(mysqlSql, finalParams);
  const duration = performance.now() - started;
  recordMetric('default', duration);
  if (duration > 200) {
    logger.warn('slow-query', { sql: mysqlSql, params: finalParams, durationMs: duration });
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
  const finalParams: SqlParamList = (params ?? []).map(normalizeParam);
  const [results] = await pool.execute(sql, finalParams);
  const duration = performance.now() - started;
  recordMetric(label, duration);
  if (duration > 200) {
    logger.warn('slow-query', { label, sql, params, durationMs: duration });
  }
  return results;
};

function normalizeParam(value: unknown): SqlParam {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'valueOf' in value) {
    const primitive = (value as { valueOf: () => unknown }).valueOf();
    if (primitive === null || primitive === undefined) return null;
    if (typeof primitive === 'string' || typeof primitive === 'number' || typeof primitive === 'bigint' || typeof primitive === 'boolean') {
      return primitive;
    }
  }
  return String(value);
}
