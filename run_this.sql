-- SQL Commands to Fix Trademark Images
-- Run this file on falolega_tpms database

-- Step 1: Clear mark_assets table
DELETE FROM mark_assets;
SELECT ROW_COUNT() as deleted_rows;

-- Step 2: Update trademark_cases.mark_image to match server filenames (add mark_ prefix)
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Adapomil.jpg' WHERE mark_image = '/uploads/marks/Adapomil.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_ALPLA_DEVICE_1.jpg' WHERE mark_image = '/uploads/marks/ALPLA_DEVICE_1.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_ALPLA_Word_1.png' WHERE mark_image = '/uploads/marks/ALPLA_Word_1.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Appomil.png' WHERE mark_image = '/uploads/marks/Appomil.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_betPawa_word__device.png' WHERE mark_image = '/uploads/marks/betPawa_word__device.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Bond_tech.png' WHERE mark_image = '/uploads/marks/Bond_tech.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Canbebe.jpg' WHERE mark_image = '/uploads/marks/Canbebe.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Caprice.jpg' WHERE mark_image = '/uploads/marks/Caprice.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Caribia.png' WHERE mark_image = '/uploads/marks/Caribia.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_CHUPA_CHUPS_WORD.png' WHERE mark_image = '/uploads/marks/CHUPA_CHUPS_WORD.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_FANOLA_wordmark.png' WHERE mark_image = '/uploads/marks/FANOLA_wordmark.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Fruit-Tella.jpg' WHERE mark_image = '/uploads/marks/Fruit-Tella.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Kibao_Vodka.png' WHERE mark_image = '/uploads/marks/Kibao_Vodka.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Kingfisher.png' WHERE mark_image = '/uploads/marks/Kingfisher.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_KWAL.png' WHERE mark_image = '/uploads/marks/KWAL.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Little_sun.png' WHERE mark_image = '/uploads/marks/Little_sun.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_LOCSLAY.png' WHERE mark_image = '/uploads/marks/LOCSLAY.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_MAGNIVISION.jpg' WHERE mark_image = '/uploads/marks/MAGNIVISION.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Melody.jpg' WHERE mark_image = '/uploads/marks/Melody.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Ontex_Word.jpg' WHERE mark_image = '/uploads/marks/Ontex_Word.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Rauch_Connected.jpg' WHERE mark_image = '/uploads/marks/Rauch_Connected.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Rauch_word_only.jpg' WHERE mark_image = '/uploads/marks/Rauch_word_only.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Safa.png' WHERE mark_image = '/uploads/marks/Safa.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_SPACO.jpg' WHERE mark_image = '/uploads/marks/SPACO.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_ST_REMY_Word.jpg' WHERE mark_image = '/uploads/marks/ST_REMY_Word.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Tempur.png' WHERE mark_image = '/uploads/marks/Tempur.png';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_The_Botanist.jpg' WHERE mark_image = '/uploads/marks/The_Botanist.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_THE_CHURCH_OF_JESUS_CHRIST_OF_LATTER-DAY_SAINTS_Logo.jpg' WHERE mark_image = '/uploads/marks/THE_CHURCH_OF_JESUS_CHRIST_OF_LATTER-DAY_SAINTS_Logo.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_VANCOSALA.jpg' WHERE mark_image = '/uploads/marks/VANCOSALA.jpg';
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Yippy.jpg' WHERE mark_image = '/uploads/marks/Yippy.jpg';

-- Verify trademark_cases updates
SELECT COUNT(*) as updated_trademark_cases FROM trademark_cases WHERE mark_image LIKE '%/mark_%';

-- Step 3: Rebuild mark_assets with correct foreign keys
INSERT INTO mark_assets (id, case_id, type, file_path, is_active, created_at)
SELECT UUID(), tc.id, 'LOGO', tc.mark_image, 1, NOW()
FROM trademark_cases tc
WHERE tc.mark_image IS NOT NULL 
  AND tc.mark_image != ''
  AND tc.mark_image LIKE '/uploads/marks/mark_%';

-- Verify mark_assets inserts
SELECT ROW_COUNT() as inserted_mark_assets;
SELECT COUNT(*) as total_mark_assets FROM mark_assets;

-- Step 4: Final verification
SELECT mark_image FROM trademark_cases WHERE mark_image IS NOT NULL LIMIT 5;
SELECT file_path FROM mark_assets LIMIT 5;

-- Step 5: Create index for fast lookups on mark_assets
ALTER TABLE mark_assets ADD INDEX idx_case_type_active (case_id, type, is_active);

-- Step 6: Create view to fetch logos consistently from mark_assets
CREATE OR REPLACE VIEW case_logos AS
SELECT 
    tc.id as case_id,
    tc.mark_name,
    ma.file_path as logo_path,
    ma.id as asset_id,
    ma.created_at
FROM trademark_cases tc
LEFT JOIN mark_assets ma ON tc.id = ma.case_id 
    AND ma.type = 'LOGO' 
    AND ma.is_active = 1 
    AND ma.deleted_at IS NULL
WHERE tc.deleted_at IS NULL;

-- Verify view works
SELECT * FROM case_logos LIMIT 5;
