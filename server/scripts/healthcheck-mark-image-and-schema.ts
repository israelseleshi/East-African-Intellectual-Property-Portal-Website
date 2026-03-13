import { pool } from '../src/database/db.js';

interface CountRow {
  count: number | string;
}

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return 0;
};

const run = async () => {
  const [base64Rows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM trademark_cases
     WHERE mark_image LIKE 'data:image%'`
  );

  const [legacyColumnRows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'trademark_cases'
       AND COLUMN_NAME = 'eipa_form_json'`
  );

  const [nonPathRows] = await pool.execute(
    `SELECT COUNT(*) AS count
     FROM trademark_cases
     WHERE mark_image IS NOT NULL
       AND TRIM(mark_image) <> ''
       AND mark_image NOT LIKE '/uploads/%'
       AND mark_image NOT LIKE '/forms-download/%'
       AND mark_image NOT LIKE '/api/forms-download/%'
       AND mark_image NOT LIKE 'http://%'
       AND mark_image NOT LIKE 'https://%'`
  );

  const base64Count = toNumber((base64Rows as CountRow[])[0]?.count);
  const legacyColumnCount = toNumber((legacyColumnRows as CountRow[])[0]?.count);
  const nonPathCount = toNumber((nonPathRows as CountRow[])[0]?.count);

  const hasBase64 = base64Count > 0;
  const hasLegacyColumn = legacyColumnCount > 0;
  const hasSuspiciousPaths = nonPathCount > 0;

  console.log('\nTPMS Data Integrity Health Check');
  console.log('--------------------------------');
  console.log(`Base64 in mark_image: ${base64Count}`);
  console.log(`Legacy eipa_form_json column present: ${hasLegacyColumn ? 'YES' : 'NO'}`);
  console.log(`Unexpected mark_image path format count: ${nonPathCount}`);

  if (!hasBase64 && !hasLegacyColumn && !hasSuspiciousPaths) {
    console.log('\nPASS: No base64 mark images, no legacy JSON column, and no suspicious mark_image paths.');
    return;
  }

  console.error('\nFAIL: Data integrity checks found issues.');
  if (hasBase64) {
    console.error(`- ${base64Count} row(s) still contain base64 in mark_image.`);
  }
  if (hasLegacyColumn) {
    console.error('- trademark_cases.eipa_form_json still exists.');
  }
  if (hasSuspiciousPaths) {
    console.error(`- ${nonPathCount} row(s) have mark_image in an unexpected format.`);
  }

  process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error('Health check failed unexpectedly:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
