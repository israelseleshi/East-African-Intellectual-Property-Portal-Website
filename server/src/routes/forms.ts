import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sanitizeFilename } from '../utils/filing.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

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

const submitSchema = z.object({
    clientId: z.string().optional(),
    applicantName: z.string().optional(),
    applicantNameAmharic: z.string().optional(),
    applicantType: z.string().optional(),
    nationality: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
    addressStreet: z.string().optional(),
    addressZone: z.string().optional(),
    wereda: z.string().optional(),
    city: z.string().optional(),
    houseNo: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    poBox: z.string().optional(),
    fax: z.string().optional(),
    markName: z.string().optional(),
    markType: z.string().optional(),
    markDescription: z.string().optional(),
    colorIndication: z.string().optional(),
    priority: z.string().optional(),
    priorityCountry: z.string().optional(),
    niceClasses: z.array(z.union([
        z.coerce.number().int().positive(),
        z.object({
            classNo: z.coerce.number().int().positive(),
            description: z.string().optional()
        })
    ])).optional(),
    markImage: z.string().optional(),
    pdfBase64: z.string().optional(),
    jurisdiction: z.string().optional(),
    flowStage: z.string().optional(),
    eipaFormData: z.record(z.unknown()).optional(),
    formData: z.record(z.unknown()).optional()
}).passthrough();

const filenameParamSchema = z.object({
    filename: z.string().min(1)
});

const caseIdParamSchema = z.object({
    caseId: z.string().min(1)
});

/**
 * POST /api/forms/submit
 * Submit EIPA form with PDF upload
 * Creates trademark case, client (if needed), and saves PDF
 */
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        const parsed = submitSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FORM_SUBMIT_PAYLOAD',
                message: 'Invalid form submission payload',
                details: parsed.error.flatten()
            });
        }

        const data = parsed.data;
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
            flowStage,

            // Full EIPA Form payload (optional)
            eipaFormData,
            formData
        } = data;

        const mergedForm = ((eipaFormData || formData || {}) as Record<string, unknown>);
        const pickString = (keys: string[]): string | undefined => {
            for (const key of keys) {
                const value = mergedForm[key];
                if (typeof value === 'string') {
                    const normalized = value.trim();
                    if (normalized) return normalized;
                }
            }
            return undefined;
        };
        const pickBoolean = (keys: string[]): boolean | undefined => {
            for (const key of keys) {
                const value = mergedForm[key];
                if (typeof value === 'boolean') return value;
                if (typeof value === 'string') {
                    const normalized = value.trim().toLowerCase();
                    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
                    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
                }
                if (typeof value === 'number') {
                    if (value === 1) return true;
                    if (value === 0) return false;
                }
            }
            return undefined;
        };
        const pickDate = (keys: string[]): string | null => {
            for (const key of keys) {
                const value = mergedForm[key];
                if (typeof value !== 'string') continue;
                const normalized = value.trim();
                if (!normalized) return null;
                const parsed = new Date(normalized);
                if (Number.isNaN(parsed.getTime())) return null;
                return parsed.toISOString().split('T')[0];
            }
            return null;
        };

        const normalizedApplicantName = applicantName || pickString(['applicant_name_english']) || '';
        const normalizedApplicantAmharic = applicantNameAmharic || pickString(['applicant_name_amharic']) || null;
        const normalizedApplicantType = applicantType
            || (pickBoolean(['chk_company']) ? 'COMPANY' : 'INDIVIDUAL');
        const normalizedNationality = nationality || pickString(['nationality']) || null;
        const normalizedResidenceCountry = pickString(['residence_country']) || null;
        const normalizedEmail = email || pickString(['email']) || null;
        const normalizedTelephone = telephone || pickString(['telephone']) || null;
        const normalizedAddressStreet = addressStreet || pickString(['address_street']) || null;
        const normalizedAddressZone = addressZone || pickString(['address_zone']) || null;
        const normalizedWereda = wereda || pickString(['wereda']) || null;
        const normalizedCity = city || pickString(['city_name']) || null;
        const normalizedHouseNo = houseNo || pickString(['house_no']) || null;
        const normalizedState = state || pickString(['state_name']) || null;
        const normalizedZipCode = zipCode || pickString(['zip_code']) || null;
        const normalizedPoBox = poBox || pickString(['po_box']) || null;
        const normalizedFax = fax || pickString(['fax']) || null;

        const normalizedMarkDescription = markDescription || pickString(['mark_description']) || null;
        const normalizedMarkName = markName || normalizedMarkDescription || 'New Mark';
        const normalizedMarkType = markType
            || (pickBoolean(['mark_type_three_dim', 'type_thre'])
                ? 'THREE_DIMENSION'
                : pickBoolean(['mark_type_mixed', 'k_type_mi'])
                    ? 'MIXED'
                    : pickBoolean(['mark_type_figurative', 'type_figur'])
                        ? 'LOGO'
                        : 'WORD');
        const normalizedIsThreeDimensional = normalizedMarkType === 'THREE_DIMENSION' ? 1 : 0;
        const normalizedColorIndication = colorIndication || pickString(['mark_color_indication']) || 'Black & White';
        const normalizedPriorityCountry = priorityCountry || pickString(['priority_country']) || null;
        const normalizedPriorityFilingDate = pickDate(['priority_filing_date', 'priority_application_filing_date']);
        
        // Add signing date components from eipaFormData if available
        const applicant_sign_day = pickString(['applicant_sign_day']);
        const applicant_sign_month = pickString(['applicant_sign_month']);
        let applicant_sign_year_en = pickString(['applicant_sign_year_en']);
        
        // Convert YYYY to YY for signing year as requested
        if (applicant_sign_year_en && applicant_sign_year_en.length === 4) {
            applicant_sign_year_en = applicant_sign_year_en.slice(-2);
        }
        const normalizedGoodsPrevApplication = pickString(['goods_and_services_covered_by_the_previous_application', 'priority_goods_services']) || null;
        const normalizedPriorityDeclaration = pickString(['priority_right_declaration']) || null;
        const normalizedTranslation = pickString(['mark_translation']) || null;
        const normalizedMarkTransliteration = pickString(['mark_transliteration']) || null;
        const normalizedMarkLanguage = pickString(['mark_language_requiring_traslation', 'mark_language_requiring_translation']) || null;
        const normalizedThreeDimFeatures = pickString(['mark_has_three_dim_features']) || null;
        const disclaimerAmharic = pickString(['disclaimer_text_amharic', 'disclaimer_amharic']) || null;
        const disclaimerEnglish = pickString(['disclaimer_text_english', 'disclaimer_english']) || null;

        const normalizedPriority = (priority === 'YES' || priority === 'NO')
            ? priority
            : (normalizedPriorityCountry || normalizedPriorityFilingDate || normalizedPriorityDeclaration || pickBoolean(['chk_priority_accompanies', 'chk_priority_submitted_later']))
                ? 'YES'
                : 'NO';

        const chkListCopies = Boolean(pickBoolean(['chk_list_copies']));
        const chkListStatus = Boolean(pickBoolean(['chk_list_status', 'chk_list_statutes']));
        const chkListPoa = Boolean(pickBoolean(['chk_list_poa']));
        const chkListPriorityDocs = Boolean(pickBoolean(['chk_list_priority_docs']));
        const chkListDrawing = Boolean(pickBoolean(['chk_list_drawing']));
        const chkListPayment = Boolean(pickBoolean(['chk_list_payment']));
        const chkListOther = Boolean(pickBoolean(['chk_list_other']));

        const userId = (req as unknown as { user: { id: string } }).user.id || null;
        const normalizedStatus = data.status || (mergedForm.formType === 'RENEWAL' ? 'RENEWAL' : 'DRAFT');
        const normalizedFlowStage = flowStage || (mergedForm.formType === 'RENEWAL' ? 'RENEWAL_DUE' : 'DATA_COLLECTION');

        // Validate required fields
        if (!existingClientId && !normalizedApplicantName) {
            return sendApiError(req, res, 400, {
                code: 'MISSING_APPLICANT',
                message: 'Missing required fields',
                details: 'Either select an existing client or provide an applicant name'
            });
        }
        if (!normalizedMarkName) {
            return sendApiError(req, res, 400, {
                code: 'MISSING_MARK_NAME',
                message: 'Missing required fields',
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
                if (!normalizedApplicantName) {
                    throw new Error('Applicant name is required when no existing client is selected');
                }
                clientId = crypto.randomUUID();
                await connection.execute(
                    `INSERT INTO clients (
                        id, name, local_name, type, nationality, residence_country, email,
                        address_street, city, state_name, zip_code, address_zone, wereda,
                        house_no, po_box, telephone, fax, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                    [
                        clientId,
                        normalizedApplicantName,
                        normalizedApplicantAmharic,
                        normalizedApplicantType === 'COMPANY' ? 'COMPANY' : 'INDIVIDUAL',
                        normalizedNationality,
                        normalizedResidenceCountry,
                        normalizedEmail,
                        normalizedAddressStreet,
                        normalizedCity,
                        normalizedState,
                        normalizedZipCode,
                        normalizedAddressZone,
                        normalizedWereda,
                        normalizedHouseNo,
                        normalizedPoBox,
                        normalizedTelephone,
                        normalizedFax
                    ]
                );
            }

            // 2. Create trademark case
            const caseId = crypto.randomUUID();
            
            await (connection as any).execute(
                `INSERT INTO trademark_cases (
                    id, client_id, jurisdiction, mark_name, mark_type, 
                    color_indication, status, filing_number, priority,
                    priority_country, priority_filing_date, goods_prev_application, priority_declaration,
                    mark_description, translation, mark_transliteration, mark_language_requiring_traslation,
                    mark_has_three_dim_features, is_three_dimensional, disclaimer_english, disclaimer_amharic,
                    chk_list_copies, chk_list_status, chk_list_poa, chk_list_priority_docs,
                    chk_list_drawing, chk_list_payment, chk_list_other,
                    client_instructions, remark,
                    applicant_sign_day, applicant_sign_month, applicant_sign_year_en,
                    flow_stage, user_id, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [
                    caseId,
                    clientId,
                    jurisdiction || 'ET',
                    normalizedMarkName,
                    normalizedMarkType,
                    normalizedColorIndication,
                    normalizedStatus,
                    null as string | null, // No filing number on intake
                    normalizedPriority,
                    normalizedPriorityCountry,
                    normalizedPriorityFilingDate,
                    normalizedGoodsPrevApplication,
                    normalizedPriorityDeclaration,
                    normalizedMarkDescription,
                    normalizedTranslation,
                    normalizedMarkTransliteration,
                    normalizedMarkLanguage,
                    normalizedThreeDimFeatures,
                    normalizedIsThreeDimensional,
                    disclaimerEnglish,
                    disclaimerAmharic,
                    chkListCopies ? 1 : 0,
                    chkListStatus ? 1 : 0,
                    chkListPoa ? 1 : 0,
                    chkListPriorityDocs ? 1 : 0,
                    chkListDrawing ? 1 : 0,
                    chkListPayment ? 1 : 0,
                    chkListOther ? 1 : 0,
                    null as string | null, // client_instructions
                    null as string | null, // remark
                    applicant_sign_day || null,
                    applicant_sign_month || null,
                    applicant_sign_year_en || null,
                    normalizedFlowStage,
                    userId
                ]
            );

            // 2.5 Save Nice Classes and mappings
            if (niceClasses && Array.isArray(niceClasses)) {
                const formDataRecord = formData as Record<string, unknown> | undefined;
                const eipaFormRecord = eipaFormData as Record<string, unknown> | undefined;
                for (const nc of niceClasses) {
                    const classNo = typeof nc === 'object' ? nc.classNo : nc;
                    const description = typeof nc === 'object'
                        ? (nc.description || '')
                        : String(formDataRecord?.goods_services_list || eipaFormRecord?.goods_services_list || [1, 2, 3, 4, 5, 6].map((idx) => mergedForm[`goods_services_list_${idx}`]).filter(Boolean).join('\n') || '');
                    
                    await connection.execute(
                        'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
                        [caseId, classNo, description]
                    );
                }
            }

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
                        applicantName: normalizedApplicantName,
                        markName: normalizedMarkName,
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
        logRouteError(req, 'forms.submit', error);
        sendApiError(req, res, 500, {
            code: 'FORM_SUBMIT_FAILED',
            message: 'Failed to submit form',
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
        const parsed = filenameParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FILENAME',
                message: 'Invalid filename',
                details: parsed.error.flatten()
            });
        }
        const { filename } = parsed.data;
        
        // Security: Prevent directory traversal
        if (filename.includes('..') || filename.includes('/')) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FILENAME',
                message: 'Invalid filename'
            });
        }

        const filePath = path.join(FORMS_UPLOAD_DIR, filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return sendApiError(req, res, 404, {
                code: 'FILE_NOT_FOUND',
                message: 'File not found'
            });
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
        logRouteError(req, 'forms.download', error);
        sendApiError(req, res, 500, {
            code: 'FORM_DOWNLOAD_FAILED',
            message: 'Failed to download file'
        });
    }
});

/**
 * GET /api/forms/list
 * List all submitted forms for a case
 */
router.get('/list/:caseId', authenticateToken, async (req, res) => {
    try {
        const parsed = caseIdParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_CASE_ID',
                message: 'Invalid case id',
                details: parsed.error.flatten()
            });
        }
        const { caseId } = parsed.data;
        
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
        logRouteError(req, 'forms.list', error);
        sendApiError(req, res, 500, {
            code: 'FORMS_LIST_FAILED',
            message: 'Failed to list forms'
        });
    }
});

export default router;
