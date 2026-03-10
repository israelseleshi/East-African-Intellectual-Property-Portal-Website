import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getConnection } from '../database/db.js';
import { caseRepository } from '../repositories/caseRepository.js';
import { FEE_SCHEDULE, JURISDICTION_CONFIG, uploadDir } from '../utils/constants.js';
import { addDays, recalculateDeadlines } from '../utils/deadlines.js';
import { sanitizeFilename } from '../utils/filing.js';
const normalizeDate = (value) => {
    if (!value)
        return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const getSafeId = () => {
    try {
        return crypto.randomUUID();
    }
    catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
};
export const caseLifecycleService = {
    async updateCaseStatus(input) {
        const oldCase = await caseRepository.findCaseById(input.caseId);
        if (!oldCase) {
            return null;
        }
        const connection = await getConnection();
        try {
            await connection.beginTransaction();
            await caseRepository.insertCaseHistory(connection, {
                caseId: input.caseId,
                userId: input.userId ?? null,
                action: `STATUS_CHANGE: ${oldCase.status} -> ${input.status}`,
                oldData: { status: oldCase.status },
                newData: { status: input.status, note: input.actionNote }
            });
            await caseRepository.updateCaseStatus(connection, {
                caseId: input.caseId,
                status: input.status,
                hadFilingDate: Boolean(oldCase.filing_date),
                hadRegistrationDate: Boolean(oldCase.registration_dt),
                publicationDate: input.publicationDate
            });
            const invoiceStage = input.status === 'REGISTERED' ? 'CERTIFICATE_ISSUED' : input.status;
            const jurisdiction = oldCase.jurisdiction;
            const fees = FEE_SCHEDULE[jurisdiction];
            if (fees && fees[invoiceStage]) {
                const fee = fees[invoiceStage];
                const classCount = await caseRepository.countNiceClasses(connection, input.caseId);
                const totalAmount = fee.amount + (fee.per_extra_class_amount * Math.max(0, classCount - 1));
                const invoiceId = crypto.randomUUID();
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
                await caseRepository.insertInvoice(connection, {
                    id: invoiceId,
                    clientId: oldCase.client_id,
                    invoiceNumber,
                    currency: oldCase.jurisdiction === 'ET' ? 'ETB' : 'KES',
                    totalAmount,
                    notes: `Auto-generated for ${input.status}`
                });
                await caseRepository.insertInvoiceItem(connection, {
                    invoiceId,
                    caseId: input.caseId,
                    description: fee.description,
                    category: fee.category,
                    amount: totalAmount
                });
            }
            await connection.commit();
            const updatedCase = { ...oldCase, status: input.status };
            if (input.status === 'PUBLISHED' && input.publicationDate) {
                updatedCase.publication_date = new Date(input.publicationDate);
            }
            await recalculateDeadlines(input.caseId, input.status, updatedCase, connection);
            return { id: input.caseId, status: input.status };
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    async advanceFlowStage(input) {
        const caseData = await caseRepository.findCaseById(input.caseId);
        if (!caseData) {
            return null;
        }
        const jurisdiction = caseData.jurisdiction;
        const effectiveDate = normalizeDate(input.triggerDate);
        const extraData = input.extraData ?? {};
        const connection = await getConnection();
        try {
            await connection.beginTransaction();
            const updates = { flow_stage: input.stage };
            if (extraData.filingNumber)
                updates.filing_number = extraData.filingNumber;
            if (extraData.certificateNumber)
                updates.certificate_number = extraData.certificateNumber;
            const jurisdictionConfig = JURISDICTION_CONFIG[jurisdiction] ?? JURISDICTION_CONFIG.ET;
            switch (input.stage) {
                case 'DATA_COLLECTION':
                case 'READY_TO_FILE':
                    updates.status = 'DRAFT';
                    break;
                case 'FILED': {
                    if (!caseData.mark_name || !caseData.client_id || !caseData.jurisdiction) {
                        throw new Error('Case validation failed: mark name, client, and jurisdiction are required for filing.');
                    }
                    let filingNumber = String(caseData.filing_number || extraData.filingNumber || '');
                    if (!filingNumber) {
                        const year = new Date().getFullYear();
                        const random = Math.floor(1000 + Math.random() * 9000);
                        filingNumber = `${jurisdiction}/TM/${year}/${random}`;
                    }
                    updates.filing_date = effectiveDate;
                    updates.next_action_date = addDays(effectiveDate, 20);
                    updates.status = 'FILED';
                    updates.filing_number = filingNumber;
                    break;
                }
                case 'FORMAL_EXAM':
                    updates.next_action_date = addDays(effectiveDate, 30);
                    updates.status = 'FORMAL_EXAM';
                    break;
                case 'SUBSTANTIVE_EXAM':
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.substantial_exam_days || 20);
                    updates.status = 'SUBSTANTIVE_EXAM';
                    break;
                case 'AMENDMENT_PENDING':
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.amendment_period_days || 90);
                    updates.status = 'AMENDMENT_PENDING';
                    break;
                case 'PUBLISHED':
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.opposition_period_days || 60);
                    updates.status = 'PUBLISHED';
                    break;
                case 'CERTIFICATE_REQUEST':
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.certificate_request_days || 20);
                    updates.status = 'PUBLISHED';
                    break;
                case 'CERTIFICATE_ISSUED':
                    updates.registration_dt = effectiveDate;
                    updates.status = 'REGISTERED';
                    if (extraData.certificateNumber)
                        updates.certificate_number = extraData.certificateNumber;
                    break;
                case 'REGISTERED': {
                    const renewalDate = new Date(effectiveDate);
                    renewalDate.setFullYear(renewalDate.getFullYear() + (jurisdictionConfig.renewal_years || 7));
                    updates.registration_dt = effectiveDate;
                    updates.expiry_date = renewalDate;
                    updates.status = 'REGISTERED';
                    if (extraData.certificateNumber)
                        updates.certificate_number = extraData.certificateNumber;
                    break;
                }
                case 'RENEWAL_DUE':
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.renewal_on_time_days || 30);
                    updates.status = 'RENEWAL';
                    break;
                case 'RENEWAL_ON_TIME': {
                    const regDate = (await caseRepository.findCaseRegistrationDate(connection, input.caseId)) || new Date();
                    const newExpiry = new Date(regDate);
                    newExpiry.setFullYear(newExpiry.getFullYear() + (jurisdictionConfig.renewal_years || 7));
                    updates.expiry_date = newExpiry;
                    updates.status = 'REGISTERED';
                    break;
                }
                case 'RENEWAL_PENALTY': {
                    const regDate = (await caseRepository.findCaseRegistrationDate(connection, input.caseId)) || new Date();
                    const newExpiry = new Date(regDate);
                    newExpiry.setFullYear(newExpiry.getFullYear() + (jurisdictionConfig.renewal_years || 7));
                    updates.expiry_date = newExpiry;
                    updates.next_action_date = addDays(effectiveDate, jurisdictionConfig.renewal_penalty_days || 180);
                    updates.status = 'RENEWAL';
                    break;
                }
                case 'DEAD_WITHDRAWN':
                    updates.status = 'WITHDRAWN';
                    break;
                default:
                    break;
            }
            await caseRepository.updateCaseFields(connection, input.caseId, updates);
            const nextActionDate = updates.next_action_date;
            if (nextActionDate) {
                const deadlineType = input.stage === 'PUBLISHED'
                    ? 'OPPOSITION_WINDOW'
                    : input.stage === 'AMENDMENT_PENDING'
                        ? 'OFFICE_ACTION_RESPONSE'
                        : input.stage === 'RENEWAL_DUE'
                            ? 'RENEWAL'
                            : `${input.stage}_DEADLINE`;
                await caseRepository.supersedePendingDeadlines(connection, input.caseId);
                await caseRepository.insertDeadline(connection, {
                    caseId: input.caseId,
                    dueDate: nextActionDate,
                    type: deadlineType
                });
            }
            else if (input.stage === 'REGISTERED' && updates.expiry_date) {
                await caseRepository.supersedePendingDeadlines(connection, input.caseId);
                await caseRepository.insertDeadline(connection, {
                    caseId: input.caseId,
                    dueDate: updates.expiry_date,
                    type: 'RENEWAL'
                });
            }
            await caseRepository.insertCaseHistory(connection, {
                caseId: input.caseId,
                userId: input.userId ?? null,
                action: `STAGE_CHANGE: ${String(caseData.flow_stage || 'NEW')} -> ${input.stage}`,
                oldData: { flow_stage: caseData.flow_stage },
                newData: { flow_stage: input.stage, deadlines: updates, notes: input.notes }
            });
            if (input.notes && input.notes.trim()) {
                await caseRepository.insertCaseNote(connection, {
                    caseId: input.caseId,
                    userId: input.userId ?? null,
                    content: input.notes,
                    noteType: 'INTERNAL',
                    isPrivate: true
                });
            }
            const fees = FEE_SCHEDULE[jurisdiction];
            if (fees && fees[input.stage]) {
                const fee = fees[input.stage];
                const invoiceId = getSafeId();
                const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
                const classCount = await caseRepository.countNiceClasses(connection, input.caseId);
                const totalAmount = fee.amount + (fee.per_extra_class_amount * Math.max(0, classCount - 1));
                await caseRepository.insertInvoice(connection, {
                    id: invoiceId,
                    clientId: caseData.client_id,
                    invoiceNumber,
                    currency: jurisdiction === 'ET' ? 'ETB' : 'KES',
                    totalAmount,
                    notes: `Auto-generated for ${input.stage}`
                });
                await caseRepository.insertInvoiceItem(connection, {
                    invoiceId,
                    caseId: input.caseId,
                    description: fee.description,
                    category: fee.category,
                    amount: totalAmount
                });
            }
            await connection.commit();
            return { success: true, id: input.caseId, stage: input.stage, message: `Case moved to ${input.stage}` };
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    },
    async updateCase(input) {
        const connection = await getConnection();
        const data = input.payload;
        try {
            await connection.beginTransaction();
            const clientId = await caseRepository.findCaseClientId(connection, input.caseId);
            if (!clientId) {
                return null;
            }
            const clientPayload = data.client ?? undefined;
            if (clientPayload) {
                const clientUpdates = {};
                if (clientPayload.name !== undefined)
                    clientUpdates.name = clientPayload.name;
                if (clientPayload.nationality !== undefined)
                    clientUpdates.nationality = clientPayload.nationality;
                if (clientPayload.email !== undefined)
                    clientUpdates.email = clientPayload.email;
                if (clientPayload.phone !== undefined)
                    clientUpdates.telephone = clientPayload.phone;
                if (clientPayload.fax !== undefined)
                    clientUpdates.fax = clientPayload.fax;
                if (clientPayload.addressStreet !== undefined)
                    clientUpdates.address_street = clientPayload.addressStreet;
                if (clientPayload.city !== undefined)
                    clientUpdates.city = clientPayload.city;
                await caseRepository.updateClientFields(connection, clientId, clientUpdates);
            }
            const caseUpdates = {};
            if (data.markName !== undefined)
                caseUpdates.mark_name = data.markName;
            if (data.markType !== undefined)
                caseUpdates.mark_type = data.markType;
            if (data.colorIndication !== undefined)
                caseUpdates.color_indication = data.colorIndication;
            if (data.priority !== undefined)
                caseUpdates.priority = data.priority;
            if (data.filingNumber !== undefined)
                caseUpdates.filing_number = data.filingNumber;
            if (data.markDescription !== undefined)
                caseUpdates.mark_description = data.markDescription;
            if (data.clientInstructions !== undefined)
                caseUpdates.client_instructions = data.clientInstructions;
            if (data.remark !== undefined)
                caseUpdates.remark = data.remark;
            if (data.eipaForm !== undefined)
                caseUpdates.eipa_form_json = JSON.stringify(data.eipaForm);
            const markImage = data.mark_image;
            if (typeof markImage === 'string' && markImage.startsWith('data:image')) {
                const parts = markImage.split(',');
                const mimeType = parts[0].match(/:(.*?);/)?.[1];
                const extension = mimeType?.split('/')[1] || 'png';
                const base64Data = parts[1];
                const info = await caseRepository.findCaseMarkAndClientName(connection, input.caseId);
                const safeApplicant = sanitizeFilename(info.client_name || 'unknown');
                const safeDescription = sanitizeFilename(String(data.markName || info.mark_name || 'mark'));
                const filename = `mark_${safeApplicant}_${safeDescription}_${Date.now()}.${extension}`;
                const marksDir = path.join(uploadDir, 'marks');
                if (!fs.existsSync(marksDir))
                    fs.mkdirSync(marksDir, { recursive: true });
                const filePath = path.join(marksDir, filename);
                const relativePath = `/uploads/marks/${filename}`;
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                caseUpdates.mark_image = relativePath;
                await caseRepository.insertMarkAsset(connection, {
                    caseId: input.caseId,
                    type: 'LOGO',
                    filePath: relativePath
                });
            }
            else if (typeof markImage === 'string') {
                caseUpdates.mark_image = markImage;
            }
            if (Object.keys(caseUpdates).length > 0) {
                await caseRepository.updateCaseFields(connection, input.caseId, {
                    ...caseUpdates,
                    updated_at: new Date()
                });
            }
            const classes = data.niceClasses;
            if (Array.isArray(classes)) {
                await caseRepository.replaceNiceClassMappings(connection, input.caseId, classes.map((c) => Number(c)).filter((v) => Number.isFinite(v)), String(data.goodsServices || data.goods_services || ''));
            }
            await connection.commit();
            return { success: true, message: 'Trademark and client details updated' };
        }
        catch (error) {
            await connection.rollback();
            throw error;
        }
        finally {
            connection.release();
        }
    }
};
