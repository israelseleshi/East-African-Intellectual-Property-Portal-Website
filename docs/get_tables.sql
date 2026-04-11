-- Get full schema for ALL tables in one query
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_KEY,
    COLUMN_DEFAULT,
    EXTRA
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'falolega_tpms'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Output will show columns for all 16 tables:
-- invoice_items, oppositions, case_notes, users, case_history, nice_classes, 
-- agents, jurisdictions, user_refresh_tokens, nice_class_mappings, 
-- trademark_cases, clients, fee_schedules, payments, deadlines, 
-- mark_assets, invoices