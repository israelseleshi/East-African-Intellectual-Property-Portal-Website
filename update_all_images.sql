-- Complete SQL to populate ALL mark_image fields
-- Run in phpMyAdmin on falolega_tpms database

-- First, let's see what still needs updating
SELECT id, mark_name, mark_image 
FROM trademark_cases 
WHERE (mark_image IS NULL OR mark_image = '') 
  AND deleted_at IS NULL;

-- Update based on mark_name patterns (add mark_ prefix to match server files)
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_BRUICHLADDICH.png' WHERE mark_name LIKE 'BRUICHLADDICH' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_REIG_JOFRE.png' WHERE mark_name LIKE 'REIG JOFRE%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Mentos_Device.png' WHERE mark_name LIKE 'Mentos Device' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_BRUICHLADDICH_ROUNDEL_2022.png' WHERE mark_name LIKE 'BRUICHLADDICH ROUNDEL%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Kracks.png' WHERE mark_name LIKE 'Kracks' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Kress.png' WHERE mark_name LIKE 'Kress' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_CHRISTUS_IN_THE_ARCH_ABOVE_THE_CORNERSTONE_(Logo).png' WHERE mark_name LIKE 'CHRISTUS%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Beverly_Hills_Polo.png' WHERE mark_name LIKE 'Beverly Hills%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_BRAVO.png' WHERE mark_name LIKE 'BRAVO' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_RAY-BAN.png' WHERE mark_name LIKE 'RAY-BAN%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_LIAHONA.png' WHERE mark_name LIKE 'LIAHONA%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Tricefin.png' WHERE mark_name LIKE 'Tricefin' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_RUBAH.png' WHERE mark_name LIKE 'RUBAH%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Phamilac.png' WHERE mark_name LIKE 'Phamilac' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Applac.png' WHERE mark_name LIKE 'Applac' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_MacCoffee.png' WHERE mark_name LIKE 'MacCoffee' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_MAGNIVISION.png' WHERE mark_name LIKE 'MAGNIVISION%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_BOSS.png' WHERE mark_name LIKE 'BOSS%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Caprice.png' WHERE mark_name LIKE 'Caprice' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_PERSOL.png' WHERE mark_name LIKE 'PERSOL%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_DR_MARTENS.png' WHERE mark_name LIKE 'DR. MARTENS%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_AIM.png' WHERE mark_name LIKE 'AIM%' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Parijat.png' WHERE mark_name LIKE 'Parijat' AND mark_image IS NULL;
UPDATE trademark_cases SET mark_image = '/uploads/marks/mark_Rauch_word_only.png' WHERE mark_name LIKE 'Rauch word only%' AND mark_image IS NULL;

-- Check how many updated
SELECT ROW_COUNT() as updated_rows;

-- Now rebuild mark_assets with ALL images
DELETE FROM mark_assets;

INSERT INTO mark_assets (id, case_id, type, file_path, is_active, created_at)
SELECT UUID(), tc.id, 'LOGO', tc.mark_image, 1, NOW()
FROM trademark_cases tc
WHERE tc.mark_image IS NOT NULL 
  AND tc.mark_image != ''
  AND tc.mark_image LIKE '/uploads/marks/mark_%';

SELECT ROW_COUNT() as inserted_mark_assets;
