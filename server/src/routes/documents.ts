import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createReport } from 'docx-templates';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadDir } from '../utils/constants.js';

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const { caseId, templateName = 'trademark_application' } = req.body;

        const [rows] = await pool.execute(`
      SELECT tc.*, c.name as client_name, c.address_street, c.city, c.nationality
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE tc.id = ?
    `, [caseId]) as unknown[];
        const caseData = (rows as Array<Record<string, unknown>>)[0];

        if (!caseData) return res.status(404).json({ error: 'Case not found' });

        const templatePath = path.join(process.cwd(), 'templates', templateName);
        if (!fs.existsSync(templatePath)) return res.status(404).json({ error: `Template ${templateName} not found` });

        const templateContent = fs.readFileSync(templatePath);
        const buffer = await createReport({
            template: templateContent,
            data: {
                case: caseData,
                date: new Date().toLocaleDateString(),
                generated_by: (req as unknown as { user: { name: string } }).user.name
            },
            cmdDelimiter: ['{', '}']
        });

        const sanitizedName = ((caseData as { client_name?: string }).client_name || 'trademark').replace(/[^a-z0-9]/gi, '_');
        const outputFilename = `${sanitizedName}_Trademark_Form.docx`;
        const outputPath = path.join(uploadDir, outputFilename);
        const relativePath = `/uploads/${outputFilename}`;

        fs.writeFileSync(outputPath, Buffer.from(buffer));

        res.json({ url: relativePath });
    } catch (error: unknown) {
        console.error('Doc Gen Error:', error);
        res.status(500).json({ error: 'Generation failed', details: (error as Error).message });
    }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { caseId, type } = req.body;
        const filePath = `/uploads/${req.file.filename}`;

        if (caseId) {
            await pool.execute(
                `INSERT INTO mark_assets (id, case_id, type, file_path, is_active) VALUES (?, ?, ?, ?, 1)`,
                [crypto.randomUUID(), caseId, type || 'LOGO', filePath]
            );
        }

        res.json({ filePath, filename: req.file.filename });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

export default router;
