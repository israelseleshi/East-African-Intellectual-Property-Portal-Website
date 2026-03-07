import express from 'express';
import { pool, getConnection } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { recalculateDeadlines, addDays, formatDate } from '../utils/deadlines.js';
import { FEE_SCHEDULE } from '../utils/constants.js';
import type { CaseRow } from '../database/types.js';

const router = express.Router();

// Get all cases (with search)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { q, status, jurisdiction } = req.query;
        let sql = `
      SELECT tc.*, c.name as client_name, c.type as client_type 
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE 1=1
    `;
        const params: any[] = [];

        if (status && status !== 'ALL') {
            sql += ' AND tc.status = ?';
            params.push(status);
        }

        if (jurisdiction && jurisdiction !== 'ALL') {
            sql += ' AND tc.jurisdiction = ?';
            params.push(jurisdiction);
        }

        if (q) {
            sql += ' AND (tc.mark_name LIKE ? OR tc.filing_number LIKE ? OR c.name LIKE ?)';
            const like = `%${q}%`;
            params.push(like, like, like);
        }

        sql += ' ORDER BY tc.created_at DESC';

        const [rows] = await pool.execute(sql, params);
        const cases = rows as CaseRow[];

        // Fetch all deadlines for these cases
        if (cases.length > 0) {
            const caseIds = cases.map(c => c.id);
            const [deadlineRows] = await pool.execute(
                `SELECT * FROM deadlines WHERE case_id IN (${caseIds.map(() => '?').join(',')}) ORDER BY due_date ASC`,
                caseIds
            );
            const deadlines = deadlineRows as Array<{ case_id: string; [key: string]: unknown }>;

            cases.forEach(c => {
                (c as CaseRow & { deadlines: typeof deadlines }).deadlines = deadlines.filter(d => d.case_id === c.id);
            });
        }

        res.json(cases);
    } catch (error) {
        console.error('Error fetching cases:', error);
        res.status(500).json({ error: 'Failed to fetch cases' });
    }
});

// Get case by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [caseRows] = await pool.execute(`
      SELECT tc.*, 
        c.id as client_id_ref,
        c.name as client_name, 
        c.type as client_type,
        c.nationality as client_nationality, 
        c.email as client_email,
        c.address_street as client_address_street,
        c.city as client_city,
        c.zip_code as client_zip_code
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE tc.id = ?
    `, [id]);

        if ((caseRows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }

        const caseData = (caseRows as Array<Record<string, unknown>>)[0];

        // Build nested client object
        const client = {
            id: caseData.client_id_ref as string,
            name: caseData.client_name as string,
            type: caseData.client_type as string,
            nationality: caseData.client_nationality as string,
            email: caseData.client_email as string,
            addressStreet: caseData.client_address_street as string,
            city: caseData.client_city as string,
            zipCode: caseData.client_zip_code as string
        };

        const [niceRows] = await pool.execute('SELECT class_no as classNo, description FROM nice_class_mappings WHERE case_id = ?', [id]);
        const niceMappings = niceRows as any[];
        const niceClasses = niceMappings.map(m => m.classNo);

        const [assetsRows] = await pool.execute('SELECT * FROM mark_assets WHERE case_id = ? AND is_active = 1', [id]);
        const [historyRows] = await pool.execute('SELECT * FROM case_history WHERE case_id = ? ORDER BY created_at DESC', [id]);
        const [deadlineRows] = await pool.execute('SELECT * FROM deadlines WHERE case_id = ? ORDER BY due_date ASC', [id]);

        const [eipaRows] = await pool.execute(
            'SELECT payload_json, form_version, jurisdiction, updated_at FROM eipa_form_payloads WHERE case_id = ? LIMIT 1',
            [id]
        );

        let eipaForm: unknown = null;
        const first = (eipaRows as Array<{ payload_json: unknown }>)[0];
        if (first && first.payload_json) {
            try {
                eipaForm = typeof first.payload_json === 'string' ? JSON.parse(first.payload_json) : first.payload_json;
            } catch {
                eipaForm = first.payload_json;
            }
        }

        const result = {
            ...caseData,
            client,
            niceClasses,
            niceMappings,
            assets: assetsRows,
            history: historyRows,
            deadlines: deadlineRows,
            eipaForm
        };
        res.json(result);
    } catch (error) {
        console.error('Error fetching case:', error);
        res.status(500).json({ error: 'Failed to fetch case' });
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
                data.markImage || null
            ];

            try {
                console.log('Inserting case with params:', caseParams);
                await connection.execute(
                    'INSERT INTO trademark_cases (id, jurisdiction, mark_name, mark_type, status, flow_stage, client_id, user_id, color_indication, priority, client_instructions, remark, mark_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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

        const [rows] = await pool.execute('SELECT * FROM trademark_cases WHERE id = ?', [id]);
        const cases = rows as CaseRow[];
        if (cases.length === 0) return res.status(404).json({ error: 'Case not found' });

        const oldCase = cases[0];
        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            await connection.execute(
                'INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
                [crypto.randomUUID(), id, userId || null, `STATUS_CHANGE: ${oldCase.status} -> ${status}`, JSON.stringify({ status: oldCase.status }), JSON.stringify({ status, note: actionNote })]
            );

            let updateSql = 'UPDATE trademark_cases SET status = ?';
            const params: any[] = [status];

            if (status === 'FILED' && !oldCase.filing_date) updateSql += ', filing_date = NOW()';
            if (status === 'REGISTERED' && !oldCase.registration_dt) updateSql += ', registration_dt = NOW()';
            if (status === 'PUBLISHED' && publicationDate) {
                updateSql += ', publication_date = ?';
                params.push(publicationDate);
            }

            updateSql += ' WHERE id = ?';
            params.push(id);

            await connection.execute(updateSql, params);

            // Auto-generate invoice for billable status changes (FILED, PUBLISHED, REGISTERED)
            const invoiceStage = status === 'REGISTERED' ? 'CERTIFICATE_ISSUED' : status;
            const fees = FEE_SCHEDULE[oldCase.jurisdiction as 'ET' | 'KE'];
            if (fees && fees[invoiceStage]) {
                const fee = fees[invoiceStage];
                const invoiceId = crypto.randomUUID();
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

                await connection.execute(
                    `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
                     VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'DRAFT')`,
                    [invoiceId, oldCase.client_id, invoiceNumber, oldCase.jurisdiction === 'ET' ? 'ETB' : 'KES', fee.amount, `Auto-generated for ${status}`]
                );

                await connection.execute(
                    `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [crypto.randomUUID(), invoiceId, id, fee.description, fee.category, fee.amount]
                );
            }

            await connection.commit();

            const updatedCase = { ...oldCase, status };
            if (status === 'PUBLISHED' && publicationDate) (updatedCase as Record<string, unknown>).publication_date = publicationDate;
            await recalculateDeadlines(id, status, updatedCase);

            res.json({ id, status });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch {
        res.status(500).json({ error: 'Failed to update status' });
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
                case 'READY_TO_FILE':
                    deadlineUpdates.status = 'DRAFT';
                    break;
                case 'FILED':
                    // Filing Submission Bridge: Validate core data before allowing filing
                    if (!caseData.mark_name || !caseData.client_id || !caseData.jurisdiction) {
                        throw new Error('Case validation failed: Mark Name, Client, and Jurisdiction are required for filing.');
                    }
                    deadlineUpdates.filing_date = effectiveDate;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 30); // Formal exam deadline
                    deadlineUpdates.status = 'FILED';
                    if (extraData.filingNumber) deadlineUpdates.filing_number = extraData.filingNumber;
                    break;
                case 'FORMAL_EXAM':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 30);
                    deadlineUpdates.status = 'FORMAL_EXAM';
                    break;
                case 'SUBSTANTIVE_EXAM':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 120); // Default 4-month watch period
                    deadlineUpdates.status = 'SUBSTANTIVE_EXAM';
                    break;
                case 'AMENDMENT_PENDING':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 90);
                    deadlineUpdates.status = 'SUBSTANTIVE_EXAM';
                    break;
                case 'PUBLISHED': {
                    const oppDays = jurisdiction === 'ET' ? 60 : 90;
                    deadlineUpdates.next_action_date = addDays(effectiveDate, oppDays); // Opposition deadline
                    deadlineUpdates.status = 'PUBLISHED';
                    break;
                }
                case 'CERTIFICATE_REQUEST':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 30);
                    break;
                case 'CERTIFICATE_ISSUED':
                    deadlineUpdates.registration_dt = effectiveDate;
                    if (extraData.certificateNumber) deadlineUpdates.certificate_number = extraData.certificateNumber;
                    break;
                case 'REGISTERED': {
                    const renewalDate = new Date(effectiveDate);
                    renewalDate.setFullYear(renewalDate.getFullYear() + (jurisdiction === 'ET' ? 7 : 10));
                    deadlineUpdates.registration_dt = effectiveDate;
                    deadlineUpdates.expiry_date = renewalDate;
                    deadlineUpdates.status = 'REGISTERED';
                    if (extraData.certificateNumber) deadlineUpdates.certificate_number = extraData.certificateNumber;
                    break;
                }
                case 'RENEWAL_DUE':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 30);
                    deadlineUpdates.status = 'RENEWAL';
                    break;
                case 'RENEWAL_ON_TIME':
                    deadlineUpdates.status = 'REGISTERED';
                    break;
                case 'RENEWAL_PENALTY':
                    deadlineUpdates.next_action_date = addDays(effectiveDate, 180);
                    break;
                case 'DEAD_WITHDRAWN':
                    deadlineUpdates.status = 'EXPIRING';
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

                // Mark previous deadlines for this case as completed/stale? 
                // Or just update the one for this specific type?
                // Senior approach: Clear any existing incomplete deadlines for this case when moving stages to avoid clutter
                await connection.execute('DELETE FROM deadlines WHERE case_id = ? AND is_completed = FALSE', [id]);

                await connection.execute(
                    `INSERT INTO deadlines (id, case_id, due_date, type, is_completed) VALUES (?, ?, ?, ?, ?)`,
                    [getSafeId(), id, formatDate(deadlineUpdates.next_action_date as Date), deadlineType, false]
                );
            } else if (stage === 'REGISTERED') {
                // Handling specifically the long-term renewal deadline for registered marks
                await connection.execute('DELETE FROM deadlines WHERE case_id = ? AND is_completed = FALSE', [id]);
                await connection.execute(
                    `INSERT INTO deadlines (id, case_id, due_date, type, is_completed) VALUES (?, ?, ?, ?, ?)`,
                    [getSafeId(), id, formatDate(deadlineUpdates.expiry_date as Date), 'RENEWAL', false]
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

                await connection.execute(
                    `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
           VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'DRAFT')`,
                    [invoiceId, (caseData as Record<string, unknown>).client_id, invoiceNumber, jurisdiction === 'ET' ? 'ETB' : 'KES', fee.amount, `Auto-generated for ${stage}`]
                );

                await connection.execute(
                    `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [getSafeId(), invoiceId, id, fee.description, fee.category, fee.amount]
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
                if (client.phone !== undefined) { clientUpdates.push('phone = ?'); clientValues.push(client.phone); }
                
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

            // 5. Update EIPA Form Payload if provided
            if (data.eipaForm !== undefined) {
                await connection.execute(
                    `INSERT INTO eipa_form_payloads (id, case_id, jurisdiction, form_version, payload_json, updated_at)
                     VALUES (?, ?, ?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = NOW()`,
                    [crypto.randomUUID(), id, 'ET', 'EIPA_FORM_01', JSON.stringify(data.eipaForm)]
                );
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
