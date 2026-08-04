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

const PERFORMANCE_INDEXES: { name: string; table: string; sql: string }[] = [
  // trademark_cases — most-queried table
  { name: 'idx_trademark_cases_status', table: 'trademark_cases', sql: 'CREATE INDEX idx_trademark_cases_status ON trademark_cases(status)' },
  { name: 'idx_trademark_cases_jurisdiction', table: 'trademark_cases', sql: 'CREATE INDEX idx_trademark_cases_jurisdiction ON trademark_cases(jurisdiction)' },
  { name: 'idx_trademark_cases_deleted_at', table: 'trademark_cases', sql: 'CREATE INDEX idx_trademark_cases_deleted_at ON trademark_cases(deleted_at)' },
  { name: 'idx_trademark_cases_client_id', table: 'trademark_cases', sql: 'CREATE INDEX idx_trademark_cases_client_id ON trademark_cases(client_id)' },
  { name: 'idx_trademark_cases_created_at', table: 'trademark_cases', sql: 'CREATE INDEX idx_trademark_cases_created_at ON trademark_cases(created_at)' },

  // deadlines — heavy JOIN + filter
  { name: 'idx_deadlines_case_id', table: 'deadlines', sql: 'CREATE INDEX idx_deadlines_case_id ON deadlines(case_id)' },
  { name: 'idx_deadlines_status_completed', table: 'deadlines', sql: 'CREATE INDEX idx_deadlines_status_completed ON deadlines(status, is_completed)' },
  { name: 'idx_deadlines_due_date', table: 'deadlines', sql: 'CREATE INDEX idx_deadlines_due_date ON deadlines(due_date)' },

  // clients — soft-delete + search
  { name: 'idx_clients_deleted_at', table: 'clients', sql: 'CREATE INDEX idx_clients_deleted_at ON clients(deleted_at)' },
  { name: 'idx_clients_name', table: 'clients', sql: 'CREATE INDEX idx_clients_name ON clients(name)' },

  // case_history — audit trail
  { name: 'idx_case_history_case_id', table: 'case_history', sql: 'CREATE INDEX idx_case_history_case_id ON case_history(case_id)' },
  { name: 'idx_case_history_created_at', table: 'case_history', sql: 'CREATE INDEX idx_case_history_created_at ON case_history(created_at)' },

  // nice_class_mappings — JOIN
  { name: 'idx_nice_class_mappings_case_id', table: 'nice_class_mappings', sql: 'CREATE INDEX idx_nice_class_mappings_case_id ON nice_class_mappings(case_id)' },

  // mark_assets — JOIN
  { name: 'idx_mark_assets_case_id', table: 'mark_assets', sql: 'CREATE INDEX idx_mark_assets_case_id ON mark_assets(case_id)' },

  // invoices — financial queries
  { name: 'idx_invoices_client_id', table: 'invoices', sql: 'CREATE INDEX idx_invoices_client_id ON invoices(client_id)' },
  { name: 'idx_invoices_deleted_at', table: 'invoices', sql: 'CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at)' },
  { name: 'idx_invoices_status', table: 'invoices', sql: 'CREATE INDEX idx_invoices_status ON invoices(status)' },
  { name: 'idx_invoices_currency', table: 'invoices', sql: 'CREATE INDEX idx_invoices_currency ON invoices(currency)' },
];

const ensureIndex = async (idx: typeof PERFORMANCE_INDEXES[number]) => {
  try {
    await pool.execute(idx.sql);
    logger.info('db-index-created', { index: idx.name, table: idx.table });
  } catch (err: unknown) {
    // Index already exists (MySQL errno 1061) or table doesn't exist yet — skip
    const mysqlErr = err as { code?: string; errno?: number };
    if (mysqlErr.errno === 1061 || mysqlErr.code === 'ER_DUP_KEYNAME') {
      logger.info('db-index-exists', { index: idx.name, table: idx.table });
    } else {
      logger.warn('db-index-skip', { index: idx.name, table: idx.table, error: String(err) });
    }
  }
};

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

  // Apply performance indexes — safe to re-run (duplicate indexes are caught by errno 1061)
  for (const idx of PERFORMANCE_INDEXES) {
    await ensureIndex(idx);
  }
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
