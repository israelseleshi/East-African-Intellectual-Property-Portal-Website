import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';
import { TrademarkStatus, CaseFlowStage, JURISDICTION_CONFIG } from '../database/types.js';
import { pool, getConnection } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { addDays, formatDate } from '../utils/deadlines.js';
import { FEE_SCHEDULE, uploadDir } from '../utils/constants.js';
import { sanitizeFilename } from '../utils/filing.js';
import type { CaseRow } from '../database/types.js';
import { caseQueryService } from '../services/caseQueryService.js';
import { caseLifecycleService } from '../services/caseLifecycleService.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const caseListQuerySchema = z.object({
    q: z.string().optional(),
    status: z.string().optional(),
    jurisdiction: z.string().optional()
});

const caseIdParamSchema = z.object({
    id: z.string().min(1)
});

// Get all cases (with search)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const parsed = caseListQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_CASE_QUERY',
                message: 'Invalid case query',
                details: parsed.error.flatten()
            });
        }

        const { q, status, jurisdiction } = parsed.data;
        const cases = await caseQueryService.listCases({
            q,
            status,
            jurisdiction
        });
        res.json(cases);
    } catch (error) {
        logRouteError(req, 'cases.list', error);
        sendApiError(req, res, 500, {
            code: 'CASES_FETCH_FAILED',
            message: 'Failed to fetch cases'
        });
    }
});

// Get case by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const parsed = caseIdParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_CASE_ID',
                message: 'Invalid case id',
                details: parsed.error.flatten()
            });
        }

        const result = await caseQueryService.getCaseById(parsed.data.id);
        if (!result) {
            return sendApiError(req, res, 404, {
                code: 'CASE_NOT_FOUND',
                message: 'Case not found'
            });
        }
        res.json(result);
    } catch (error) {
        logRouteError(req, 'cases.getById', error);
        sendApiError(req, res, 500, {
            code: 'CASE_FETCH_FAILED',
            message: 'Failed to fetch case'
        });
    }
});

// Create case
// Create case (and client if needed)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const data = req.body;
        const userId = req.user.id;

        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            // Helper to sanitize ANY array of parameters
            const sanitize = (params: unknown[]) => params.map(v => v === undefined ? null : v);

            let clientId = data.clientId;

            // 1. If no clientId provided, create the client first
            if (!clientId) {
                if (!data.applicantName) {
                    throw new Error('Applicant Name is required if no Client ID is provided.');
                }

                clientId = crypto.randomUUID();
                const clientParams: any[] = [
                    clientId,
                    data.applicantName,
                    data.applicantType || 'COMPANY',
                    data.nationality || null,
                    data.email || null,
                    data.addressStreet || null,
                    data.city || null,
                    data.zipCode || null
                ];

                try {
                    console.log('Inserting client with params:', clientParams);
                    await connection.execute(
                        'INSERT INTO clients (id, name, type, nationality, email, address_street, city, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        clientParams
                    );
                } catch (clientError: unknown) {
                    console.error('Failed to insert client:', (clientError as Error).message);
                    connection.release(); // Explicit release before throwing
                    throw new Error(`Client creation failed: ${(clientError as Error).message}`);
                }
            }

            // 2. Create the Trademark Case
            const newCaseId = crypto.randomUUID();
            const caseParams: any[] = [
                newCaseId,
                data.jurisdiction || 'ET',
                data.markName || data.markDescription || 'New Mark',
                data.markType || 'WORD',
                data.status || 'DRAFT',
                'DATA_COLLECTION',
                clientId,
                userId || null,
                data.colorIndication || 'Black & White',
                data.priority || 'NO',
                data.clientInstructions || null,
                data.remark || null,
                data.markImage || null,
                data.markDescription || null
            ];

            try {
                console.log('Inserting case with params:', caseParams);
                await connection.execute(
                    'INSERT INTO trademark_cases (id, jurisdiction, mark_name, mark_type, status, flow_stage, client_id, user_id, color_indication, priority, client_instructions, remark, mark_image, mark_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    caseParams
                );
            } catch (caseError: unknown) {
                console.error('Failed to insert case:', (caseError as Error).message);
                connection.release(); // Explicit release before throwing
                throw new Error(`Case creation failed: ${(caseError as Error).message}`);
            }

            // 3. Add Nice Classes if provided
            if (data.niceClasses && data.niceClasses.length > 0) {
                console.log('Inserting nice classes:', data.niceClasses);
                for (const nc of data.niceClasses) {
                    // Check if nc is just a number (from new picker) or object (legacy)
                    const classNo = typeof nc === 'object' ? nc.classNo : nc;
                    const description = typeof nc === 'object' ? nc.description : (data.goodsServicesDescription || '');

                    const classParams: any[] = [newCaseId, classNo, description];
                    console.log(`Inserting nice class [${classNo}] params:`, classParams);

                    try {
                        await connection.execute(
                            'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
                            classParams
                        );
                    } catch (ncError: unknown) {
                        console.warn(`Failed to insert nice class ${classNo}:`, (ncError as Error).message);
                        connection.release(); // Explicit release before throwing
                        throw new Error(`Nice class mapping failed for class ${classNo}: ${(ncError as Error).message}`);
                    }
                }
            }

            await connection.commit();
            connection.release(); // Explicit release on success
            console.log('Registration successful, case created:', newCaseId);
            res.status(201).json({ id: newCaseId, clientId, ...data });
        } catch {
            await connection.rollback();
            if (connection) connection.release(); // Final safety release
            res.status(500).json({
                error: 'Submission failed'
            });
        }
    } catch (error: unknown) {
        console.error('Error creating case:', error);
        res.status(500).json({ error: 'Failed to create case', details: (error as Error).message });
    }
});

// Update status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId, actionNote, publicationDate } = req.body;
        const result = await caseLifecycleService.updateCaseStatus({
            caseId: id,
            status,
            userId,
            actionNote,
            publicationDate
        });

        if (!result) {
            return sendApiError(req, res, 404, {
                code: 'CASE_NOT_FOUND',
                message: 'Case not found'
            });
        }

        res.json(result);
    } catch (error) {
        logRouteError(req, 'cases.updateStatus', error);
        sendApiError(req, res, 500, {
            code: 'CASE_STATUS_UPDATE_FAILED',
            message: 'Failed to update status'
        });
    }
});

// 10-Stage Case Flow
router.patch('/:id/flow-stage', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { stage, triggerDate, notes, ...extraData } = req.body;

        const [rows] = await pool.execute('SELECT * FROM trademark_cases WHERE id = ?', [id]);
        const cases = rows as CaseRow[];
        if (cases.length === 0) return res.status(404).json({ error: 'Case not found' });

        const caseData = cases[0];
        const jurisdiction = caseData.jurisdiction as 'ET' | 'KE';
        const effectiveDate = triggerDate ? new Date(triggerDate) : new Date();

        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            const deadlineUpdates: Record<string, unknown> = {
                flow_stage: stage
            };

            // Map any extra data from the smart modals to DB columns
            if (extraData.filingNumber) deadlineUpdates.filing_number = extraData.filingNumber;
            if (extraData.certificateNumber) deadlineUpdates.certificate_number = extraData.certificateNumber;

            switch (stage) {
                case 'DATA_COLLECTION':
                    deadlineUpdates.status = 'DRAFT';
                    break;
                case 'READY_TO_FILE':
                    deadlineUpdates.status = 'DRAFT';
                    break;
                case 'FILED':
                    // Filing Submission Bridge: Validate core data before allowing filing
                    if (!caseData.mark_name || !caseData.client_id || !caseData.jurisdiction) {
                        throw new Error('Case validation failed: Mark Name, Client, and Jurisdiction are required for filing.');
                    }
                    
                    // AUTO-ASSIGN FILING NUMBER IF MISSING
                    let filingNumber = caseData.filing_number || extraData.filingNumber;
                    if (!filingNumber) {
                        const year = new Date().getFullYear();
                        const random = Math.floor(1000 + Math.random() * 9000);
                        filingNumber = `${jurisdiction}/TM/${year}/${random}`;
                    }

                    deadlineUpdates.filing_date = effectiveDate;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 20); // Substantive exam watch (20 days)
                    deadlineUpdates.status = 'FILED';
                    deadlineUpdates.filing_number = filingNumber;
                    break;
                case 'FORMAL_EXAM':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 30);
                    deadlineUpdates.status = 'FORMAL_EXAM';
                    break;
                case 'SUBSTANTIVE_EXAM':
                    // Default to 20 days as per handwritten flow (Day 40 to 60)
                    const examDays = JURISDICTION_CONFIG[jurisdiction]?.substantial_exam_days || 20;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, examDays);
                    deadlineUpdates.status = 'SUBSTANTIVE_EXAM';
                    break;
                case 'AMENDMENT_PENDING':
                    // 90-day amendment window from Path B
                    const amndDays = JURISDICTION_CONFIG[jurisdiction]?.amendment_period_days || 90;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, amndDays);
                    deadlineUpdates.status = 'AMENDMENT_PENDING';
                    break;
                case 'PUBLISHED': {
                    const oppDays = JURISDICTION_CONFIG[jurisdiction]?.opposition_period_days || 60;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, oppDays); // Opposition deadline
                    deadlineUpdates.status = 'PUBLISHED';
                    break;
                }
                case 'CERTIFICATE_REQUEST':
                    const reqDays = JURISDICTION_CONFIG[jurisdiction]?.certificate_request_days || 20;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, reqDays);
                    deadlineUpdates.status = 'PUBLISHED'; // Still published until issued
                    break;
                case 'CERTIFICATE_ISSUED':
                    deadlineUpdates.registration_dt = effectiveDate;
                    deadlineUpdates.status = 'REGISTERED';
                    if (extraData.certificateNumber) deadlineUpdates.certificate_number = extraData.certificateNumber;
                    break;
                case 'REGISTERED': {
                    const renewalYears = JURISDICTION_CONFIG[jurisdiction]?.renewal_years || 7;
                    const renewalDate = new Date(effectiveDate);
                    renewalDate.setFullYear(renewalDate.getFullYear() + renewalYears);
                    deadlineUpdates.registration_dt = effectiveDate;
                    deadlineUpdates.expiry_date = renewalDate;
                    deadlineUpdates.status = 'REGISTERED';
                    if (extraData.certificateNumber) deadlineUpdates.certificate_number = extraData.certificateNumber;
                    break;
                }
                case 'RENEWAL_DUE':
                    const onTimeDays = JURISDICTION_CONFIG[jurisdiction]?.renewal_on_time_days || 30;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, onTimeDays);
                    deadlineUpdates.status = 'RENEWAL';
                    break;
                case 'RENEWAL_ON_TIME': {
                    const renewalYears = JURISDICTION_CONFIG[jurisdiction]?.renewal_years || 7;
                    const [caseRows] = await connection.execute('SELECT registration_dt FROM trademark_cases WHERE id = ?', [id]);
                    const regDate = (caseRows as any[])[0]?.registration_dt || new Date();
                    
                    const newExpiry = new Date(regDate);
                    newExpiry.setFullYear(newExpiry.getFullYear() + renewalYears);
                    
                    deadlineUpdates.expiry_date = newExpiry;
                    deadlineUpdates.status = 'REGISTERED';
                    break;
                }
                case 'RENEWAL_PENALTY': {
                    const renewalYears = JURISDICTION_CONFIG[jurisdiction]?.renewal_years || 7;
                    const penaltyDays = JURISDICTION_CONFIG[jurisdiction]?.renewal_penalty_days || 180;
                    
                    const [caseRows] = await connection.execute('SELECT registration_dt FROM trademark_cases WHERE id = ?', [id]);
                    const regDate = (caseRows as any[])[0]?.registration_dt || new Date();
                    
                    const newExpiry = new Date(regDate);
                    newExpiry.setFullYear(newExpiry.getFullYear() + renewalYears);
                    
                    deadlineUpdates.expiry_date = newExpiry;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, penaltyDays);
                    deadlineUpdates.status = 'RENEWAL';
                    break;
                }
                case 'DEAD_WITHDRAWN':
                    deadlineUpdates.status = 'WITHDRAWN';
                    break;
            }

            const fields = Object.keys(deadlineUpdates);
            const setClause = fields.map(f => `${f} = ?`).join(', ');

            // Format all dates as strings for the UPDATE query
            const values: any[] = fields.map(f => {
                const val = deadlineUpdates[f];
                return val instanceof Date ? formatDate(val) : val;
            });
            values.push(id);

            console.log(`[FlowUpdate] Updating case ${id} to stage ${stage}. Set:`, deadlineUpdates);
            await connection.execute(`UPDATE trademark_cases SET ${setClause} WHERE id = ?`, values);

            const userId = (req as unknown as { user: { id: string } }).user?.id || null;

            const getSafeId = () => {
                try {
                    return crypto.randomUUID();
                } catch {
                    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                }
            };

            // Unified Deadline Creation: Whenever we set a next_action_date, create/update a record in the deadlines table
            if (deadlineUpdates.next_action_date) {
                const deadlineType = stage === 'PUBLISHED' ? 'OPPOSITION_WINDOW' :
                    stage === 'AMENDMENT_PENDING' ? 'OFFICE_ACTION_RESPONSE' :
                        stage === 'RENEWAL_DUE' ? 'RENEWAL' :
                            `${stage}_DEADLINE`;

                // Mark previous pending deadlines as SUPERSEDED instead of deleting
                await connection.execute(
                    'UPDATE deadlines SET status = "SUPERSEDED" WHERE case_id = ? AND status = "PENDING"',
                    [id]
                );

                await connection.execute(
                    `INSERT INTO deadlines (id, case_id, due_date, type, status) VALUES (?, ?, ?, ?, 'PENDING')`,
                    [getSafeId(), id, formatDate(deadlineUpdates.next_action_date as Date), deadlineType]
                );
            } else if (stage === 'REGISTERED') {
                // Mark previous pending deadlines as SUPERSEDED
                await connection.execute(
                    'UPDATE deadlines SET status = "SUPERSEDED" WHERE case_id = ? AND status = "PENDING"',
                    [id]
                );
                await connection.execute(
                    `INSERT INTO deadlines (id, case_id, due_date, type, status) VALUES (?, ?, ?, ?, 'PENDING')`,
                    [getSafeId(), id, formatDate(deadlineUpdates.expiry_date as Date), 'RENEWAL']
                );
            }

            await connection.execute(
                'INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    getSafeId(),
                    id,
                    userId,
                    `STAGE_CHANGE: ${(caseData as Record<string, unknown>).flow_stage || 'NEW'} -> ${stage}`,
                    JSON.stringify({ flow_stage: (caseData as Record<string, unknown>).flow_stage }),
                    JSON.stringify({ flow_stage: stage, deadlines: deadlineUpdates, notes })
                ]
            );

            // Save notes to case_notes table if provided
            if (notes && notes.trim()) {
                await connection.execute(
                    `INSERT INTO case_notes (id, case_id, user_id, note_type, content, is_private) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [getSafeId(), id, userId, 'INTERNAL', notes, true]
                );
            }

            const fees = FEE_SCHEDULE[jurisdiction];
            if (fees && fees[stage]) {
                const fee = fees[stage];
                const invoiceId = getSafeId();
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

                // Calculate multi-class fee
                const [niceRows] = await connection.execute('SELECT COUNT(*) as count FROM nice_class_mappings WHERE case_id = ?', [id]);
                const classCount = (niceRows as any[])[0].count || 1;
                const totalAmount = fee.amount + (fee.per_extra_class_amount * Math.max(0, classCount - 1));

                await connection.execute(
                    `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
           VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'DRAFT')`,
                    [invoiceId, (caseData as Record<string, unknown>).client_id, invoiceNumber, jurisdiction === 'ET' ? 'ETB' : 'KES', totalAmount, `Auto-generated for ${stage}`]
                );

                await connection.execute(
                    `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [getSafeId(), invoiceId, id, fee.description, fee.category, totalAmount]
                );
            }

            await connection.commit();
            res.json({ success: true, id, stage, message: `Case moved to ${stage}` });
        } catch (e: unknown) {
            await connection.rollback();
            console.error('Error updating flow stage (transaction):', e);
            res.status(500).json({
                error: 'Failed to update flow stage',
                details: (e as Error).message,
            });
        } finally {
            connection.release();
        }
    } catch (error: unknown) {
        console.error('Error updating flow stage (outer):', error);
        res.status(500).json({ error: 'Failed to update flow stage', details: (error as Error).message });
    }
});

// Update trademark case and associated client details
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const connection = await getConnection();

        try {
            await connection.beginTransaction();

            // 1. Get existing case to find clientId
            const [caseRows] = await connection.execute(
                'SELECT client_id FROM trademark_cases WHERE id = ?',
                [id]
            );
            
            if ((caseRows as any[]).length === 0) {
                throw new Error('Case not found');
            }
            
            const clientId = (caseRows as any[])[0].client_id;

            // 2. Update Client Details if provided
            if (data.client) {
                const client = data.client;
                const clientUpdates: string[] = [];
                const clientValues: any[] = [];

                if (client.name !== undefined) { clientUpdates.push('name = ?'); clientValues.push(client.name); }
                if (client.nationality !== undefined) { clientUpdates.push('nationality = ?'); clientValues.push(client.nationality); }
                if (client.email !== undefined) { clientUpdates.push('email = ?'); clientValues.push(client.email); }
                if (client.phone !== undefined) { clientUpdates.push('telephone = ?'); clientValues.push(client.phone); }
                if (client.fax !== undefined) { clientUpdates.push('fax = ?'); clientValues.push(client.fax); }
                
                // Special handling for address split
                if (client.addressStreet !== undefined) { clientUpdates.push('address_street = ?'); clientValues.push(client.addressStreet); }
                if (client.city !== undefined) { clientUpdates.push('city = ?'); clientValues.push(client.city); }

                if (clientUpdates.length > 0) {
                    clientValues.push(clientId);
                    await connection.execute(
                        `UPDATE clients SET ${clientUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`,
                        clientValues
                    );
                }
            }

            // 3. Update Trademark Case Details
            const caseUpdates: string[] = [];
            const caseValues: any[] = [];

            if (data.markName !== undefined) { caseUpdates.push('mark_name = ?'); caseValues.push(data.markName); }
            if (data.markType !== undefined) { caseUpdates.push('mark_type = ?'); caseValues.push(data.markType); }
            if (data.colorIndication !== undefined) { caseUpdates.push('color_indication = ?'); caseValues.push(data.colorIndication); }
            if (data.priority !== undefined) { caseUpdates.push('priority = ?'); caseValues.push(data.priority); }
            if (data.filingNumber !== undefined) { caseUpdates.push('filing_number = ?'); caseValues.push(data.filingNumber); }
            if (data.markDescription !== undefined) { caseUpdates.push('mark_description = ?'); caseValues.push(data.markDescription); }
            if (data.clientInstructions !== undefined) { caseUpdates.push('client_instructions = ?'); caseValues.push(data.clientInstructions); }
            if (data.remark !== undefined) { caseUpdates.push('remark = ?'); caseValues.push(data.remark); }
            if (data.eipaForm !== undefined) { 
                caseUpdates.push('eipa_form_json = ?'); 
                caseValues.push(JSON.stringify(data.eipaForm)); 
            }

            // Handle image update
            if (data.mark_image && data.mark_image.startsWith('data:image')) {
                const parts = data.mark_image.split(',');
                const mimeType = parts[0].match(/:(.*?);/)?.[1];
                const extension = mimeType?.split('/')[1] || 'png';
                const base64Data = parts[1];
                
                // Get case/client info for descriptive naming
                const [caseInfoRows] = await connection.execute(
                    'SELECT tc.mark_name, c.name as client_name FROM trademark_cases tc JOIN clients c ON tc.client_id = c.id WHERE tc.id = ?',
                    [id]
                );
                const caseInfo = (caseInfoRows as any[])[0];
                
                const safeApplicant = sanitizeFilename(caseInfo?.client_name || 'unknown');
                const safeDescription = sanitizeFilename(data.markName || caseInfo?.mark_name || 'mark');
                const filename = `mark_${safeApplicant}_${safeDescription}_${Date.now()}.${extension}`;
                
                const relativePath = `/uploads/marks/${filename}`;
                const filePath = path.join(uploadDir, 'marks', filename);
                
                // Ensure directory exists
                if (!fs.existsSync(path.join(uploadDir, 'marks'))) {
                    fs.mkdirSync(path.join(uploadDir, 'marks'), { recursive: true });
                }
                
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                caseUpdates.push('mark_image = ?');
                caseValues.push(relativePath);

                // 3.1. Sync with mark_assets table
                await connection.execute(
                    'INSERT INTO mark_assets (id, case_id, type, file_path, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [crypto.randomUUID(), id, 'LOGO', relativePath]
                );
            } else if (data.mark_image !== undefined) {
                // If it's already a path, just update it
                caseUpdates.push('mark_image = ?');
                caseValues.push(data.mark_image);
            }

            if (caseUpdates.length > 0) {
                caseValues.push(id);
                await connection.execute(
                    `UPDATE trademark_cases SET ${caseUpdates.join(', ')}, updated_at = NOW() WHERE id = ?`,
                    caseValues
                );
            }

            // 4. Update Nice Classes if provided
            if (data.niceClasses !== undefined && Array.isArray(data.niceClasses)) {
                // Delete existing mappings
                await connection.execute('DELETE FROM nice_class_mappings WHERE case_id = ?', [id]);
                
                // Insert new mappings
                for (const classNo of data.niceClasses) {
                    await connection.execute(
                        'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
                        [id, classNo, data.goodsServices || data.goods_services || '']
                    );
                }
            }

            await connection.commit();
            res.json({ success: true, message: 'Trademark and client details updated' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error: any) {
        console.error('Error updating trademark:', error);
        res.status(500).json({ error: 'Failed to update trademark', details: error.message });
    }
});

export default router;
