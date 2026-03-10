import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createReport } from 'docx-templates';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { uploadDir } from '../utils/constants.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
const router = express.Router();
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });
const generateSchema = z.object({
    caseId: z.string().min(1),
    templateName: z.string().optional()
});
const uploadBodySchema = z.object({
    caseId: z.string().optional(),
    type: z.string().optional()
});
router.post('/generate', authenticateToken, async (req, res) => {
    try {
        const parsed = generateSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_DOCUMENT_GENERATE_PAYLOAD',
                message: 'Invalid document generation payload',
                details: parsed.error.flatten()
            });
        }
        const templateName = parsed.data.templateName || 'trademark_application';
        const [rows] = await pool.execute(`SELECT tc.*, c.name as client_name, c.address_street, c.city, c.nationality
       FROM trademark_cases tc
       JOIN clients c ON tc.client_id = c.id
       WHERE tc.id = ?`, [parsed.data.caseId]);
        const caseData = rows[0];
        if (!caseData) {
            return sendApiError(req, res, 404, {
                code: 'CASE_NOT_FOUND',
                message: 'Case not found'
            });
        }
        const templatePath = path.join(process.cwd(), 'templates', templateName);
        if (!fs.existsSync(templatePath)) {
            return sendApiError(req, res, 404, {
                code: 'TEMPLATE_NOT_FOUND',
                message: `Template ${templateName} not found`
            });
        }
        const templateContent = fs.readFileSync(templatePath);
        const buffer = await createReport({
            template: templateContent,
            data: {
                case: caseData,
                date: new Date().toLocaleDateString(),
                generated_by: req.user?.name || req.user?.email || 'Unknown User'
            },
            cmdDelimiter: ['{', '}']
        });
        const sanitizedName = String(caseData.client_name || 'trademark').replace(/[^a-z0-9]/gi, '_');
        const outputFilename = `${sanitizedName}_Trademark_Form.docx`;
        const outputPath = path.join(uploadDir, outputFilename);
        const relativePath = `/uploads/${outputFilename}`;
        fs.writeFileSync(outputPath, Buffer.from(buffer));
        res.json({ url: relativePath });
    }
    catch (error) {
        logRouteError(req, 'documents.generate', error);
        sendApiError(req, res, 500, {
            code: 'DOCUMENT_GENERATE_FAILED',
            message: 'Generation failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return sendApiError(req, res, 400, {
                code: 'NO_FILE_UPLOADED',
                message: 'No file uploaded'
            });
        }
        const parsed = uploadBodySchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_UPLOAD_PAYLOAD',
                message: 'Invalid upload payload',
                details: parsed.error.flatten()
            });
        }
        const { caseId, type } = parsed.data;
        const filePath = `/uploads/${req.file.filename}`;
        if (caseId) {
            await pool.execute('INSERT INTO mark_assets (id, case_id, type, file_path, is_active) VALUES (?, ?, ?, ?, 1)', [crypto.randomUUID(), caseId, type || 'LOGO', filePath]);
        }
        res.json({ filePath, filename: req.file.filename });
    }
    catch (error) {
        logRouteError(req, 'documents.upload', error);
        sendApiError(req, res, 500, {
            code: 'DOCUMENT_UPLOAD_FAILED',
            message: 'Upload failed'
        });
    }
});
export default router;
