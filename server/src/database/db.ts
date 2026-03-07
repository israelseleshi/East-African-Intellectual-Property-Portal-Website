// Database connection - Node.js only
import mysql from 'mysql2/promise';
import type { Pool } from 'mysql2/promise';

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

  const [results] = await pool.execute(mysqlSql, mysqlParams.length > 0 ? mysqlParams : (params || []));
  return { rows: Array.isArray(results) ? (results as unknown[]) : [results] };
};

export const getConnection = () => pool.getConnection();
