-- Improves /cases listing and search paths
CREATE INDEX IF NOT EXISTS idx_tc_mark_name ON trademark_cases (mark_name);
CREATE INDEX IF NOT EXISTS idx_tc_filing_number ON trademark_cases (filing_number);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients (name);
