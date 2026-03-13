import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../src/database/db.js';
import { uploadDir } from '../src/utils/constants.js';
import { sanitizeFilename } from '../src/utils/filing.js';

interface CaseImageRow extends RowDataPacket {
  id: string;
  mark_name: string | null;
  mark_image: string | null;
}

const parseDataImage = (value: string): { mimeType: string; base64Data: string } | null => {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2].replace(/\s+/g, '')
  };
};

const extensionForMimeType = (mimeType: string): string => {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'png';
  }
};

const ensureDirectory = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const dryRun = process.argv.includes('--dry-run');

const run = async () => {
  const [rows] = await pool.execute(
    `SELECT id, mark_name, mark_image
     FROM trademark_cases
     WHERE mark_image LIKE 'data:image%'`
  );

  const cases = rows as CaseImageRow[];
  console.log(`Found ${cases.length} case(s) with base64 mark_image payloads.`);

  if (cases.length === 0) {
    return;
  }

  if (dryRun) {
    for (const item of cases) {
      console.log(`Would convert case: ${item.id}`);
    }
    return;
  }

  const marksDir = path.join(uploadDir, 'marks');
  ensureDirectory(marksDir);

  const createdFiles: string[] = [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of cases) {
      if (!item.mark_image) continue;

      const parsed = parseDataImage(item.mark_image);
      if (!parsed) {
        throw new Error(`Invalid base64 image payload for case ${item.id}`);
      }

      const extension = extensionForMimeType(parsed.mimeType);
      const safeMarkName = sanitizeFilename(item.mark_name || 'mark');
      const filename = `mark_${safeMarkName}_${item.id.slice(0, 8)}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
      const absolutePath = path.join(marksDir, filename);
      const relativePath = `/uploads/marks/${filename}`;

      const buffer = Buffer.from(parsed.base64Data, 'base64');
      fs.writeFileSync(absolutePath, buffer);
      createdFiles.push(absolutePath);

      await connection.execute(
        'UPDATE trademark_cases SET mark_image = ? WHERE id = ?',
        [relativePath, item.id]
      );

      await connection.execute(
        'INSERT INTO mark_assets (id, case_id, type, file_path, is_active) VALUES (?, ?, ?, ?, 1)',
        [crypto.randomUUID(), item.id, 'LOGO', relativePath]
      );

      console.log(`Converted case ${item.id} -> ${relativePath}`);
    }

    await connection.commit();
    console.log(`Conversion complete for ${cases.length} case(s).`);
  } catch (error) {
    await connection.rollback();
    for (const filePath of createdFiles) {
      try {
        fs.unlinkSync(filePath);
      } catch {
      }
    }
    throw error;
  } finally {
    connection.release();
  }
};

run()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
