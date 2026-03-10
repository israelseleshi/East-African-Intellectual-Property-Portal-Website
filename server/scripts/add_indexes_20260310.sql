-- Refresh token store
CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_refresh_user (user_id),
  CONSTRAINT fk_user_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_tc_status_jur_created ON trademark_cases (status, jurisdiction, created_at);
CREATE INDEX IF NOT EXISTS idx_deadlines_case_status_due ON deadlines (case_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_created ON invoices (status, due_date, created_at);
