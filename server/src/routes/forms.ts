import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forms upload directory (outside the api folder, at root level)
const FORMS_UPLOAD_DIR = path.resolve(__dirname, '../../../forms-upload');

// Ensure upload directory exists
if (!fs.existsSync(FORMS_UPLOAD_DIR)) {
    fs.mkdirSync(FORMS_UPLOAD_DIR, { recursive: true });
    console.log('Created forms-upload directory:', FORMS_UPLOAD_DIR);
}

/**
 * POST /api/forms/submit
 * Submit EIPA form with PDF upload
 * Creates trademark case, client (if needed), and saves PDF
 */
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        const {
            // Applicant/Client Info
            applicantName,
            applicantNameAmharic,
            applicantType,
            nationality,
            email,
            telephone,
            addressStreet,
            addressZone,
            wereda,
            city,
            houseNo,
            state,
            zipCode,
            poBox,
            
            // Mark Info
            markName,
            markType,
            markDescription,
            colorIndication,
            priority,
            priorityCountry,
            
            // Nice Classes
            niceClasses,
            
            // Mark Image (Base64)
            markImage,
            
            // PDF Data (Base64)
            pdfBase64,
            
            // Metadata
            jurisdiction = 'ET',

            // Full EIPA Form payload (optional)
            eipaFormData,
            formData
        } = req.body;

        const userId = (req as unknown as { user: { userId: string } }).user.userId;

        // Validate required fields
        if (!applicantName || !markName) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: 'Applicant name and mark name are required'
            });
        }

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Check if client exists (by email) or create new one
            let clientId: string;
            const [existingClients] = await connection.execute(
                'SELECT id FROM clients WHERE email = ? AND name = ?',
                [email || '', applicantName]
            );

            if ((existingClients as Array<{ id: string }>).length > 0) {
                clientId = (existingClients as Array<{ id: string }>)[0].id;
            } else {
                // Create new client
                clientId = crypto.randomUUID();
                await connection.execute(
                    `INSERT INTO clients (id, name, local_name, type, nationality, email, address_street, city, zip_code, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        clientId,
                        applicantName,
                        applicantNameAmharic || null,
                        applicantType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL',
                        nationality || 'Ethiopia',
                        email || '',
                        `${addressStreet || ''} ${addressZone || ''} ${wereda || ''} ${houseNo || ''}`.trim(),
                        city || 'Addis Ababa',
                        zipCode || ''
                    ]
                );
            }

            // 2. Create trademark case
            const caseId = crypto.randomUUID();
            const filingNumber = `ET/TM/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
            
            await connection.execute(
                `INSERT INTO trademark_cases (
                    id, client_id, jurisdiction, mark_name, mark_type, 
                    color_indication, status, filing_number, priority,
                    flow_stage, user_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'FILED', ?, ?, 'FILED', ?, NOW(), NOW())`,
                [
                    caseId,
                    clientId,
                    jurisdiction,
                    markName,
                    markType || 'WORD',
                    colorIndication || 'Black & White',
                    filingNumber,
                    priority === 'YES' ? 'YES' : 'NO',
                    userId
                ]
            );

            const fullPayload = (eipaFormData || formData) as unknown;
            if (fullPayload) {
                await connection.execute(
                    `INSERT INTO eipa_form_payloads (id, case_id, jurisdiction, form_version, payload_json, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE jurisdiction = VALUES(jurisdiction), form_version = VALUES(form_version), payload_json = VALUES(payload_json), updated_at = NOW()`,
                    [
                        crypto.randomUUID(),
                        caseId,
                        jurisdiction,
                        'EIPA_FORM_01',
                        JSON.stringify(fullPayload)
                    ]
                );
            }

            // 3. Save PDF file (optional)
            let pdfPath = null;
            let pdfFilename = null;
            if (pdfBase64) {
                const pdfBuffer = Buffer.from(pdfBase64, 'base64');
                pdfFilename = `${filingNumber.replace(/\//g, '_')}_${caseId}.pdf`;
                pdfPath = path.join(FORMS_UPLOAD_DIR, pdfFilename);
                
                fs.writeFileSync(pdfPath, pdfBuffer);

                // 4. Store form metadata in database (optional - for tracking)
                await connection.execute(
                    `INSERT INTO mark_assets (id, case_id, type, file_path, file_name, file_size, created_at) 
                     VALUES (?, ?, 'FORM', ?, ?, ?, NOW())`,
                    [
                        crypto.randomUUID(),
                        caseId,
                        `/forms-download/${pdfFilename}`,
                        pdfFilename,
                        pdfBuffer.length
                    ]
                );
            }

            // 3.5 Save Mark Image (optional)
            if (markImage && markImage.startsWith('data:image')) {
                const base64Data = markImage.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const extension = markImage.split(';')[0].split('/')[1] || 'png';
                const imageFilename = `mark_${caseId}.${extension}`;
                const imagePath = path.join(FORMS_UPLOAD_DIR, imageFilename);
                
                fs.writeFileSync(imagePath, imageBuffer);

                await connection.execute(
                    `INSERT INTO mark_assets (id, case_id, type, file_path, file_name, file_size, created_at) 
                     VALUES (?, ?, 'MARK', ?, ?, ?, NOW())`,
                    [
                        crypto.randomUUID(),
                        caseId,
                        `/forms-download/${imageFilename}`,
                        imageFilename,
                        imageBuffer.length
                    ]
                );
            }

            // 5. Add to case history
            await connection.execute(
                `INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [
                    crypto.randomUUID(),
                    caseId,
                    userId,
                    'FORM_SUBMITTED',
                    JSON.stringify({ status: 'DRAFT' }),
                    JSON.stringify({ 
                        status: 'FILED', 
                        filingNumber,
                        formPath: pdfPath,
                        applicantName,
                        markName,
                        hasPdf: !!pdfBase64
                    })
                ]
            );

            // 6. Create deadlines (60 days formal exam for Ethiopia)
            const formalExamDeadline = new Date();
            formalExamDeadline.setDate(formalExamDeadline.getDate() + 60);
            
            await connection.execute(
                `INSERT INTO deadlines (id, case_id, type, due_date, description, is_completed, created_at)
                 VALUES (?, ?, 'FORMAL_EXAM', ?, 'Formal Examination Deadline', false, NOW())`,
                [
                    crypto.randomUUID(),
                    caseId,
                    formalExamDeadline.toISOString().split('T')[0]
                ]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Application submitted successfully',
                caseId,
                filingNumber,
                clientId,
                formUrl: pdfFilename ? `/forms-download/${pdfFilename}` : null,
                pdfPath: pdfPath,
                hasPdf: !!pdfBase64
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('Form submission error:', error);
        res.status(500).json({ 
            error: 'Failed to submit form',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/forms/download/:filename
 * Download a submitted form PDF
 */
router.get('/download/:filename', authenticateToken, (req, res) => {
    try {
        const { filename } = req.params;
        
        // Security: Prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }

        const filePath = path.join(FORMS_UPLOAD_DIR, filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set headers for download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

/**
 * GET /api/forms/list
 * List all submitted forms for a case
 */
router.get('/list/:caseId', authenticateToken, async (req, res) => {
    try {
        const { caseId } = req.params;
        
        const [forms] = await pool.execute(
            `SELECT ma.id, ma.file_name, ma.file_path, ma.file_size, ma.created_at,
                    tc.filing_number, tc.mark_name
             FROM mark_assets ma
             JOIN trademark_cases tc ON ma.case_id = tc.id
             WHERE ma.case_id = ? AND ma.type = 'FORM'
             ORDER BY ma.created_at DESC`,
            [caseId]
        );

        res.json(forms);

    } catch (error) {
        console.error('List forms error:', error);
        res.status(500).json({ error: 'Failed to list forms' });
    }
});

export default router;
