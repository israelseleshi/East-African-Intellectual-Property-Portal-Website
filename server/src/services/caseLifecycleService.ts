import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { CaseFlowStage, CaseRow } from '../database/types.js';
import { getConnection } from '../database/db.js';
import { caseRepository } from '../repositories/caseRepository.js';
import { FEE_SCHEDULE, JURISDICTION_CONFIG, uploadDir } from '../utils/constants.js';
import { addDays, recalculateDeadlines } from '../utils/deadlines.js';
import { sanitizeFilename } from '../utils/filing.js';

interface UpdateCaseStatusInput {
  caseId: string;
  status: string;
  userId?: string;
  actionNote?: string;
  publicationDate?: string;
}

interface AdvanceFlowStageInput {
  caseId: string;
  stage: CaseFlowStage;
  triggerDate?: string;
  notes?: string;
  extraData?: Record<string, unknown>;
  userId?: string;
}

interface UpdateCaseDetailsInput {
  caseId: string;
  payload: Record<string, unknown>;
}

const normalizeDate = (value?: string) => {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getSafeId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
};

const pickString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) return normalized;
    }
  }
  return undefined;
};

const pickOptionalString = (record: Record<string, unknown>, keys: string[]): string | null | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  return undefined;
};

const pickBoolean = (record: Record<string, unknown>, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const value = record[key];
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

const pickDate = (record: Record<string, unknown>, keys: string[]): string | null | undefined => {
  for (const key of keys) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
  }
  return undefined;
};

const mapMarkTypeFromEipa = (record: Record<string, unknown>): { markType: string; isThreeDimensional: number } | null => {
  const isThreeDim = Boolean(pickBoolean(record, ['mark_type_three_dim', 'type_thre']));
  if (isThreeDim) return { markType: 'THREE_DIMENSION', isThreeDimensional: 1 };
  if (pickBoolean(record, ['mark_type_mixed', 'k_type_mi'])) return { markType: 'MIXED', isThreeDimensional: 0 };
  if (pickBoolean(record, ['mark_type_figurative', 'type_figur'])) return { markType: 'LOGO', isThreeDimensional: 0 };
  if (pickBoolean(record, ['mark_type_word', 'type_word'])) return { markType: 'WORD', isThreeDimensional: 0 };
  return null;
};

export const caseLifecycleService = {
  async updateCaseStatus(input: UpdateCaseStatusInput): Promise<{ id: string; status: string } | null> {
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
      const jurisdiction = oldCase.jurisdiction as 'ET' | 'KE';
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

      const updatedCase: CaseRow = { ...oldCase, status: input.status };
      if (input.status === 'PUBLISHED' && input.publicationDate) {
        (updatedCase as CaseRow & { publication_date?: Date }).publication_date = new Date(input.publicationDate);
      }
      await recalculateDeadlines(input.caseId, input.status, updatedCase, connection);

      return { id: input.caseId, status: input.status };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async advanceFlowStage(input: AdvanceFlowStageInput): Promise<{ success: true; id: string; stage: CaseFlowStage; message: string } | null> {
    const caseData = await caseRepository.findCaseById(input.caseId);
    if (!caseData) {
      return null;
    }

    const jurisdiction = caseData.jurisdiction as 'ET' | 'KE';
    const effectiveDate = normalizeDate(input.triggerDate);
    const extraData = input.extraData ?? {};
    const connection = await getConnection();

    try {
      await connection.beginTransaction();

      const updates: Record<string, unknown> = { flow_stage: input.stage };
      if (extraData.filingNumber) updates.filing_number = extraData.filingNumber;
      if (extraData.certificateNumber) updates.certificate_number = extraData.certificateNumber;
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
          if (extraData.certificateNumber) updates.certificate_number = extraData.certificateNumber;
          break;
        case 'REGISTERED': {
          const renewalDate = new Date(effectiveDate);
          renewalDate.setFullYear(renewalDate.getFullYear() + (jurisdictionConfig.renewal_years || 7));
          updates.registration_dt = effectiveDate;
          updates.expiry_date = renewalDate;
          updates.status = 'REGISTERED';
          if (extraData.certificateNumber) updates.certificate_number = extraData.certificateNumber;
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

      const nextActionDate = updates.next_action_date as Date | undefined;
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
      } else if (input.stage === 'REGISTERED' && updates.expiry_date) {
        await caseRepository.supersedePendingDeadlines(connection, input.caseId);
        await caseRepository.insertDeadline(connection, {
          caseId: input.caseId,
          dueDate: updates.expiry_date as Date,
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
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateCase(input: UpdateCaseDetailsInput): Promise<{ success: true; message: string } | null> {
    const connection = await getConnection();
    const data = input.payload;

    try {
      await connection.beginTransaction();

      const clientId = await caseRepository.findCaseClientId(connection, input.caseId);
      if (!clientId) {
        return null;
      }

      const clientPayload = (data.client as Record<string, unknown> | undefined) ?? undefined;
      if (clientPayload) {
        const clientUpdates: Record<string, unknown> = {};
        if (clientPayload.name !== undefined) clientUpdates.name = clientPayload.name;
        if (clientPayload.nationality !== undefined) clientUpdates.nationality = clientPayload.nationality;
        if (clientPayload.email !== undefined) clientUpdates.email = clientPayload.email;
        if (clientPayload.phone !== undefined) clientUpdates.telephone = clientPayload.phone;
        if (clientPayload.fax !== undefined) clientUpdates.fax = clientPayload.fax;
        if (clientPayload.addressStreet !== undefined) clientUpdates.address_street = clientPayload.addressStreet;
        if (clientPayload.city !== undefined) clientUpdates.city = clientPayload.city;
        await caseRepository.updateClientFields(connection, clientId, clientUpdates);
      }

      const caseUpdates: Record<string, unknown> = {};
      if (data.markName !== undefined) caseUpdates.mark_name = data.markName;
      if (data.markType !== undefined) caseUpdates.mark_type = data.markType;
      if (data.colorIndication !== undefined) caseUpdates.color_indication = data.colorIndication;
      if (data.priority !== undefined) caseUpdates.priority = data.priority;
      if (data.filingNumber !== undefined) caseUpdates.filing_number = data.filingNumber;
      if (data.markDescription !== undefined) caseUpdates.mark_description = data.markDescription;
      if (data.clientInstructions !== undefined) caseUpdates.client_instructions = data.clientInstructions;
      if (data.remark !== undefined) caseUpdates.remark = data.remark;

      const eipaForm = (typeof data.eipaForm === 'object' && data.eipaForm !== null)
        ? data.eipaForm as Record<string, unknown>
        : null;

      if (eipaForm) {
        if (data.markDescription === undefined) {
          const markDescription = pickOptionalString(eipaForm, ['mark_description']);
          if (markDescription !== undefined) caseUpdates.mark_description = markDescription;
        }

        if (data.markName === undefined) {
          const markName = pickOptionalString(eipaForm, ['mark_description', 'mark_name']);
          if (markName !== undefined) caseUpdates.mark_name = markName;
        }

        const translation = pickOptionalString(eipaForm, ['mark_translation', 'translation']);
        if (translation !== undefined) caseUpdates.translation = translation;

        const markTransliteration = pickOptionalString(eipaForm, ['mark_transliteration']);
        if (markTransliteration !== undefined) caseUpdates.mark_transliteration = markTransliteration;

        const markLanguage = pickOptionalString(eipaForm, ['mark_language_requiring_traslation', 'mark_language_requiring_translation']);
        if (markLanguage !== undefined) caseUpdates.mark_language_requiring_traslation = markLanguage;

        const markThreeDimFeatures = pickOptionalString(eipaForm, ['mark_has_three_dim_features']);
        if (markThreeDimFeatures !== undefined) caseUpdates.mark_has_three_dim_features = markThreeDimFeatures;

        if (data.colorIndication === undefined) {
          const colorIndication = pickOptionalString(eipaForm, ['mark_color_indication']);
          if (colorIndication !== undefined) caseUpdates.color_indication = colorIndication;
        }

        if (data.priority === undefined) {
          const priority = pickString(eipaForm, ['priority']);
          if (priority === 'YES' || priority === 'NO') {
            caseUpdates.priority = priority;
          } else {
            const inferredPriority = Boolean(
              pickString(eipaForm, ['priority_country']) ||
              pickString(eipaForm, ['priority_filing_date', 'priority_application_filing_date']) ||
              pickBoolean(eipaForm, ['chk_priority_accompanies', 'chk_priority_submitted_later'])
            );
            caseUpdates.priority = inferredPriority ? 'YES' : 'NO';
          }
        }

        const priorityCountry = pickOptionalString(eipaForm, ['priority_country']);
        if (priorityCountry !== undefined) caseUpdates.priority_country = priorityCountry;

        const priorityFilingDate = pickDate(eipaForm, ['priority_filing_date', 'priority_application_filing_date']);
        if (priorityFilingDate !== undefined) caseUpdates.priority_filing_date = priorityFilingDate;

        const goodsPrevApplication = pickOptionalString(eipaForm, ['goods_and_services_covered_by_the_previous_application', 'priority_goods_services', 'goods_prev_application']);
        if (goodsPrevApplication !== undefined) caseUpdates.goods_prev_application = goodsPrevApplication;

        const priorityDeclaration = pickOptionalString(eipaForm, ['priority_right_declaration', 'priority_declaration']);
        if (priorityDeclaration !== undefined) caseUpdates.priority_declaration = priorityDeclaration;

        const disclaimerEnglish = pickOptionalString(eipaForm, ['disclaimer_text_english']);
        const disclaimerAmharic = pickOptionalString(eipaForm, ['disclaimer_text_amharic']);
        const disclaimer = pickOptionalString(eipaForm, ['disclaimer']);
        if (disclaimer !== undefined) {
          caseUpdates.disclaimer = disclaimer;
        } else if (disclaimerEnglish !== undefined || disclaimerAmharic !== undefined) {
          const parts = [
            typeof disclaimerAmharic === 'string' && disclaimerAmharic ? `AM: ${disclaimerAmharic}` : null,
            typeof disclaimerEnglish === 'string' && disclaimerEnglish ? `EN: ${disclaimerEnglish}` : null
          ].filter((item): item is string => Boolean(item));
          caseUpdates.disclaimer = parts.length > 0 ? parts.join('\n') : null;
        }

        const listCopies = pickBoolean(eipaForm, ['chk_list_copies']);
        if (listCopies !== undefined) caseUpdates.chk_list_copies = listCopies;

        const listStatus = pickBoolean(eipaForm, ['chk_list_status', 'chk_list_statutes']);
        if (listStatus !== undefined) caseUpdates.chk_list_status = listStatus;

        const listPoa = pickBoolean(eipaForm, ['chk_list_poa']);
        if (listPoa !== undefined) caseUpdates.chk_list_poa = listPoa;

        const listPriorityDocs = pickBoolean(eipaForm, ['chk_list_priority_docs']);
        if (listPriorityDocs !== undefined) caseUpdates.chk_list_priority_docs = listPriorityDocs;

        const listDrawing = pickBoolean(eipaForm, ['chk_list_drawing']);
        if (listDrawing !== undefined) caseUpdates.chk_list_drawing = listDrawing;

        const listPayment = pickBoolean(eipaForm, ['chk_list_payment']);
        if (listPayment !== undefined) caseUpdates.chk_list_payment = listPayment;

        const listOther = pickBoolean(eipaForm, ['chk_list_other']);
        if (listOther !== undefined) caseUpdates.chk_list_other = listOther;

        if (data.markType === undefined) {
          const markTypeInfo = mapMarkTypeFromEipa(eipaForm);
          if (markTypeInfo) {
            caseUpdates.mark_type = markTypeInfo.markType;
            caseUpdates.is_three_dimensional = markTypeInfo.isThreeDimensional;
          }
        }

        if (data.remark === undefined) {
          const otherDocumentsText = pickOptionalString(eipaForm, ['other_documents_text']);
          if (typeof otherDocumentsText === 'string' && otherDocumentsText) {
            caseUpdates.remark = `Other documents: ${otherDocumentsText}`;
          }
        }
      }

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
        if (!fs.existsSync(marksDir)) fs.mkdirSync(marksDir, { recursive: true });
        const filePath = path.join(marksDir, filename);
        const relativePath = `/uploads/marks/${filename}`;

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        caseUpdates.mark_image = relativePath;
        await caseRepository.insertMarkAsset(connection, {
          caseId: input.caseId,
          type: 'LOGO',
          filePath: relativePath
        });
      } else if (typeof markImage === 'string') {
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
        await caseRepository.replaceNiceClassMappings(
          connection,
          input.caseId,
          classes.map((c) => Number(c)).filter((v) => Number.isFinite(v)),
          String(data.goodsServices || data.goods_services || '')
        );
      }

      await connection.commit();
      return { success: true, message: 'Trademark and client details updated' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};
