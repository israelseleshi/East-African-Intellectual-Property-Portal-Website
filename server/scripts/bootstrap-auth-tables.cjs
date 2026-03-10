/* eslint-disable no-console */
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
  });

  // users.id is CHAR(36), so user_id must match exactly for the foreign key to be created.
  await connection.execute(`
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

  const [rows] = await connection.query("SHOW TABLES LIKE 'user_refresh_tokens'");
  console.log('user_refresh_tokens exists:', rows.length > 0);

  await connection.end();
}

main().catch((err) => {
  console.error('bootstrap-auth-tables failed:', err);
  process.exit(1);
});

