-- Migration to add missing checkbox columns and split disclaimer columns
ALTER TABLE trademark_cases
  ADD COLUMN chk_goods TINYINT(1) DEFAULT 0,
  ADD COLUMN chk_services TINYINT(1) DEFAULT 0,
  ADD COLUMN chk_collective TINYINT(1) DEFAULT 0,
  ADD COLUMN disclaimer_english TEXT,
  ADD COLUMN disclaimer_amharic TEXT;

-- We'll keep the old 'disclaimer' column for a moment if there's data,
-- but the user asked to split it and remove the EN/AM prefixing code.

-- After migration, the backend will write directly to these new columns.
