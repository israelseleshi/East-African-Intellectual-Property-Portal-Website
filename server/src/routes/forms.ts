import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sanitizeFilename } from '../utils/filing.js';

const router = express.Router();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Forms upload directory (outside the api folder, at root level)
const FORMS_UPLOAD_DIR = path.resolve(__dirname, '../forms-upload');
console.log('[forms.ts] FORMS_UPLOAD_DIR resolved to:', FORMS_UPLOAD_DIR);

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
            // Pre-existing client ID (if user selected from dropdown)
            clientId: existingClientId,

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
            fax,
            
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

        const userId = (req as unknown as { user: { id: string } }).user.id || null;

        // Validate required fields
        if (!existingClientId && !applicantName) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: 'Either select an existing client or provide an applicant name'
            });
        }
        if (!markName) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                details: 'Mark name (description) is required'
            });
        }

        // Start transaction
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            // 1. Resolve client: use existing client if provided, otherwise create one
            let clientId: string;

            if (existingClientId) {
                // Verify the provided client ID actually exists
                const [clientRows] = await connection.execute(
                    'SELECT id FROM clients WHERE id = ?',
                    [existingClientId]
                );
                if ((clientRows as Array<{ id: string }>).length === 0) {
                    throw new Error(`Client with id '${existingClientId}' not found`);
                }
                clientId = existingClientId;
            } else {
                // Create new client from form data
                if (!applicantName) {
                    throw new Error('Applicant name is required when no existing client is selected');
                }
                clientId = crypto.randomUUID();
                await connection.execute(
                    `INSERT INTO clients (id, name, local_name, type, nationality, email, address_street, city, zip_code, address_zone, wereda, house_no, po_box, telephone, fax, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        clientId,
                        applicantName,
                        applicantNameAmharic || null,
                        applicantType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL',
                        nationality || null,
                        email || '',
                        addressStreet || '',
                        city || null,
                        zipCode || '',
                        addressZone || '',
                        wereda || '',
                        houseNo || '',
                        poBox || '',
                        telephone || '',
                        fax || ''
                    ]
                );
            }

            // 2. Create trademark case
            const caseId = crypto.randomUUID();
            
            await connection.execute(
                `INSERT INTO trademark_cases (
                    id, client_id, jurisdiction, mark_name, mark_type, 
                    color_indication, status, filing_number, priority,
                    mark_description, client_instructions, remark,
                    eipa_form_json,
                    flow_stage, user_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    caseId,
                    clientId,
                    jurisdiction || 'ET',
                    markName,
                    markType || 'WORD',
                    colorIndication || 'Black & White',
                    'DRAFT',
                    null, // No filing number on intake
                    priority === 'YES' ? 'YES' : 'NO',
                    markDescription || null,
                    null, // client_instructions
                    null, // remark
                    JSON.stringify(eipaFormData || formData || {}),
                    'DATA_COLLECTION',
                    userId
                ]
            );

            // 2.5 Save Nice Classes and mappings
            if (niceClasses && Array.isArray(niceClasses)) {
                for (const nc of niceClasses) {
                    const classNo = typeof nc === 'object' ? nc.classNo : nc;
                    const description = typeof nc === 'object' ? nc.description : (formData?.goods_services_list || eipaFormData?.goods_services_list || '');
                    
                    await connection.execute(
                        'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
                        [caseId, classNo, description]
                    );
                }
            }

            const fullPayload = (eipaFormData || formData) as unknown;
            // PDF Data (Base64)
            let pdfPath = null;
            let pdfFilename = null;
            if (pdfBase64) {
                const pdfBuffer = Buffer.from(pdfBase64, 'base64');
                pdfFilename = `draft_${caseId}.pdf`;
                pdfPath = path.join(FORMS_UPLOAD_DIR, pdfFilename);
                
                fs.writeFileSync(pdfPath, pdfBuffer);

                // 4. Store PDF as POA asset (mark_assets only supports LOGO, POA, PRIORITY types)
                await connection.execute(
                    `INSERT INTO mark_assets (id, case_id, type, file_path, created_at) 
                     VALUES (?, ?, 'POA', ?, NOW())`,
                    [
                        crypto.randomUUID(),
                        caseId,
                        `/forms-download/${pdfFilename}`
                    ]
                );
            }

            // 3.5 Save Mark Image (optional)
            if (markImage && markImage.startsWith('data:image')) {
                const base64Data = markImage.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const extension = markImage.split(';')[0].split('/')[1] || 'png';
                
                // New descriptive naming: mark_[applicant]_[description]_[shortId].[ext]
                const safeApplicant = sanitizeFilename(applicantName || 'unknown');
                const safeDescription = sanitizeFilename(markName || 'mark');
                const shortId = caseId.split('-')[0];
                const imageFilename = `mark_${safeApplicant}_${safeDescription}_${shortId}.${extension}`;
                
                const imagePath = path.join(FORMS_UPLOAD_DIR, imageFilename);
                
                fs.writeFileSync(imagePath, imageBuffer);

                await connection.execute(
                    `INSERT INTO mark_assets (id, case_id, type, file_path, created_at) 
                     VALUES (?, ?, 'LOGO', ?, NOW())`,
                    [
                        crypto.randomUUID(),
                        caseId,
                        `/forms-download/${imageFilename}`
                    ]
                );

                await connection.execute(
                    `UPDATE trademark_cases SET mark_image = ? WHERE id = ?`,
                    [`/forms-download/${imageFilename}`, caseId]
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
                    JSON.stringify({ status: 'NEW' }),
                    JSON.stringify({ 
                        status: 'DRAFT', 
                        formPath: pdfPath,
                        applicantName,
                        markName,
                        hasPdf: !!pdfBase64
                    })
                ]
            );

            // 6. Create initial deadline (Data Collection / Intake review)
            const intakeDeadline = new Date();
            intakeDeadline.setDate(intakeDeadline.getDate() + 7);
            
            await connection.execute(
                `INSERT INTO deadlines (id, case_id, type, due_date, is_completed, created_at)
                 VALUES (?, ?, 'INTAKE_REVIEW', ?, false, NOW())`,
                [
                    crypto.randomUUID(),
                    caseId,
                    intakeDeadline.toISOString().split('T')[0]
                ]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: 'Application submitted successfully as DRAFT',
                caseId,
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

        // Detect content type based on extension
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // Set headers for download
        res.setHeader('Content-Type', contentType);
        if (ext === '.pdf') {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        }
        
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
            `SELECT ma.id, ma.file_path, ma.created_at,
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
