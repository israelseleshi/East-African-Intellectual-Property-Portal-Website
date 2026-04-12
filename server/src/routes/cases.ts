import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getConnection, pool } from '../database/db.js';
import { CASE_FLOW_STAGES } from '../database/types.js';
import { authenticateToken } from '../middleware/auth.js';
import { caseQueryService } from '../services/caseQueryService.js';
import { caseLifecycleService } from '../services/caseLifecycleService.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
import { uploadDir } from '../utils/constants.js';
import { sanitizeFilename } from '../utils/filing.js';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

const caseListQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  jurisdiction: z.string().optional()
});

const caseIdParamSchema = z.object({
  id: z.string().min(1)
});

const createNiceClassSchema = z.union([
  z.coerce.number().int().positive(),
  z.object({
    classNo: z.coerce.number().int().positive(),
    description: z.string().optional()
  })
]);

const createCasePayloadSchema = z.object({
  clientId: z.string().optional(),
  applicantName: z.string().optional(),
  applicantType: z.string().optional(),
  nationality: z.string().optional(),
  email: z.string().optional(),
  addressStreet: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  jurisdiction: z.string().optional(),
  markName: z.string().optional(),
  markDescription: z.string().optional(),
  markType: z.string().optional(),
  status: z.string().optional(),
  colorIndication: z.string().optional(),
  priority: z.string().optional(),
  clientInstructions: z.string().optional(),
  remark: z.string().optional(),
  markImage: z.string().optional(),
  goodsServicesDescription: z.string().optional(),
  niceClasses: z.array(createNiceClassSchema).optional()
}).passthrough();

const updateCaseStatusSchema = z.object({
  status: z.string().min(1),
  userId: z.string().optional(),
  actionNote: z.string().optional(),
  publicationDate: z.string().optional()
});

const updateFlowStageSchema = z.object({
  stage: z.enum(CASE_FLOW_STAGES),
  triggerDate: z.string().optional(),
  notes: z.string().optional(),
  filingNumber: z.string().optional(),
  certificateNumber: z.string().optional()
}).passthrough();

const updateCaseSchema = z.object({
  client: z.object({
    name: z.string().optional(),
    nationality: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    addressStreet: z.string().optional(),
    city: z.string().optional()
  }).optional(),
  markName: z.string().optional(),
  markType: z.string().optional(),
  colorIndication: z.string().optional(),
  priority: z.string().optional(),
  filingNumber: z.string().optional(),
  markDescription: z.string().optional(),
  clientInstructions: z.string().optional(),
  remark: z.string().optional(),
  eipaForm: z.unknown().optional(),
  mark_image: z.string().optional(),
  niceClasses: z.array(z.coerce.number().int().positive()).optional(),
  goodsServices: z.string().optional(),
  goods_services: z.string().optional(),
  disclaimer_english: z.string().nullable().optional(),
  disclaimer_amharic: z.string().nullable().optional(),
  chk_goods: z.union([z.boolean(), z.number()]).optional(),
  chk_services: z.union([z.boolean(), z.number()]).optional(),
  chk_collective: z.union([z.boolean(), z.number()]).optional(),
  is_word: z.union([z.boolean(), z.number()]).optional(),
  is_figurative: z.union([z.boolean(), z.number()]).optional(),
  is_mixed: z.union([z.boolean(), z.number()]).optional(),
  is_three_dim: z.union([z.boolean(), z.number()]).optional(),
  priority_country: z.string().nullable().optional(),
  priority_filing_date: z.string().nullable().optional(),
  mark_translation: z.string().nullable().optional(),
  mark_transliteration: z.string().nullable().optional(),
  mark_language_requiring_traslation: z.string().nullable().optional(),
  mark_has_three_dim_features: z.string().nullable().optional(),
  translation: z.string().nullable().optional(),
  applicant_sign_day: z.string().nullable().optional(),
  applicant_sign_month: z.string().nullable().optional(),
  applicant_sign_year_en: z.string().nullable().optional(),
  chk_priority_accompanies: z.union([z.boolean(), z.number()]).optional(),
  chk_priority_submitted_later: z.union([z.boolean(), z.number()]).optional(),
  renewal_app_no: z.string().nullable().optional(),
  renewal_reg_no: z.string().nullable().optional(),
  renewal_reg_date: z.string().nullable().optional(),
  renewal_sign_day: z.string().nullable().optional(),
  renewal_sign_month: z.string().nullable().optional(),
  renewal_sign_year: z.string().nullable().optional()
}).passthrough();

const CASE_STATUSES = new Set([
  'DRAFT',
  'FILED',
  'FORMAL_EXAM',
  'SUBSTANTIVE_EXAM',
  'PUBLISHED',
  'REGISTERED',
  'EXPIRING',
  'RENEWAL',
  'AMENDMENT_PENDING',
  'OPPOSED',
  'ABANDONED',
  'WITHDRAWN'
]);

const getString = (source: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) return normalized;
    }
  }
  return undefined;
};

const getOptionalString = (source: Record<string, unknown>, keys: string[]): string | null | undefined => {
  for (const key of keys) {
    if (key in source) {
      const value = source[key];
      if (typeof value !== 'string') return null;
      const normalized = value.trim();
      return normalized ? normalized : null;
    }
  }
  return undefined;
};

const getBoolean = (source: Record<string, unknown>, keys: string[]): boolean | undefined => {
  for (const key of keys) {
    const value = source[key];
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

const getDateString = (source: Record<string, unknown>, keys: string[]): string | null | undefined => {
  for (const key of keys) {
    if (!(key in source)) continue;
    const value = source[key];
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
  }
  return undefined;
};

const mapApplicantType = (payload: Record<string, unknown>): 'INDIVIDUAL' | 'COMPANY' | 'PARTNERSHIP' => {
  const explicit = getString(payload, ['applicantType', 'applicant_type']);
  if (explicit === 'COMPANY' || explicit === 'INDIVIDUAL' || explicit === 'PARTNERSHIP') {
    return explicit;
  }
  if (getBoolean(payload, ['chk_company'])) return 'COMPANY';
  return 'INDIVIDUAL';
};

const mapApplicantGender = (payload: Record<string, unknown>): 'MALE' | 'FEMALE' | null => {
  if (getBoolean(payload, ['chk_male'])) return 'MALE';
  if (getBoolean(payload, ['chk_female'])) return 'FEMALE';
  return null;
};

const mapMarkType = (payload: Record<string, unknown>): { markType: string; isThreeDimensional: number } => {
  const explicit = getString(payload, ['markType', 'mark_type']);
  if (explicit && ['WORD', 'LOGO', 'COMBINED', 'MIXED', 'THREE_DIMENSION', 'OTHER'].includes(explicit)) {
    return {
      markType: explicit,
      isThreeDimensional: explicit === 'THREE_DIMENSION' ? 1 : 0
    };
  }

  const isThreeDim = Boolean(getBoolean(payload, ['mark_type_three_dim', 'type_thre']));
  if (isThreeDim) {
    return { markType: 'THREE_DIMENSION', isThreeDimensional: 1 };
  }
  if (getBoolean(payload, ['mark_type_mixed', 'k_type_mi'])) {
    return { markType: 'MIXED', isThreeDimensional: 0 };
  }
  if (getBoolean(payload, ['mark_type_figurative', 'type_figur'])) {
    return { markType: 'LOGO', isThreeDimensional: 0 };
  }
  if (getBoolean(payload, ['mark_type_word', 'type_word'])) {
    return { markType: 'WORD', isThreeDimensional: 0 };
  }

  return { markType: 'WORD', isThreeDimensional: 0 };
};

const collectGoodsServicesDescription = (payload: Record<string, unknown>): string => {
  const explicit = getString(payload, ['goodsServicesDescription', 'goodsServices', 'goods_services', 'goods_services_list']);
  if (explicit) return explicit;

  const fromLines = [1, 2, 3, 4, 5, 6]
    .map((idx) => getString(payload, [`goods_services_list_${idx}`]))
    .filter((line): line is string => Boolean(line));
  return fromLines.join('\n');
};

const mapPriority = (payload: Record<string, unknown>): 'YES' | 'NO' => {
  const explicit = getString(payload, ['priority']);
  if (explicit === 'YES') return 'YES';
  if (explicit === 'NO') return 'NO';

  const hasPriority = Boolean(
    getString(payload, ['priority_country']) ||
    getString(payload, ['priority_filing_date', 'priority_application_filing_date']) ||
    getString(payload, ['priority_right_declaration']) ||
    getBoolean(payload, ['chk_priority_accompanies', 'chk_priority_submitted_later'])
  );
  return hasPriority ? 'YES' : 'NO';
};

const saveMarkImageToUploads = (
  markImage: string,
  applicantName: string,
  markName: string
): string => {
  if (!markImage.startsWith('data:image')) {
    return markImage;
  }

  const parts = markImage.split(',');
  if (parts.length < 2) {
    throw new Error('Invalid image payload format');
  }

  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const extension = mimeType.split('/')[1] || 'png';
  const base64Data = parts[1];

  const safeApplicant = sanitizeFilename(applicantName || 'unknown');
  const safeMark = sanitizeFilename(markName || 'mark');
  const filename = `mark_${safeApplicant}_${safeMark}_${Date.now()}.${extension}`;
  const marksDir = path.join(uploadDir, 'marks');
  if (!fs.existsSync(marksDir)) {
    fs.mkdirSync(marksDir, { recursive: true });
  }

  const fullPath = path.join(marksDir, filename);
  fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));

  return `/uploads/marks/${filename}`;
};

const extractNiceClasses = (payload: Record<string, unknown>): Array<{ classNo: number; description?: string }> => {
  const fromNiceClasses = Array.isArray(payload.niceClasses) ? payload.niceClasses : [];
  const fromLegacy = Array.isArray(payload.nice_classes_selected) ? payload.nice_classes_selected : [];
  const source = [...fromNiceClasses, ...fromLegacy];

  const classes: Array<{ classNo: number; description?: string }> = [];
  const seen = new Set<number>();

  for (const value of source) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0 && !seen.has(value)) {
      seen.add(value);
      classes.push({ classNo: value });
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const candidate = value as { classNo?: unknown; description?: unknown };
      const classNo = Number(candidate.classNo);
      if (Number.isInteger(classNo) && classNo > 0 && !seen.has(classNo)) {
        seen.add(classNo);
        classes.push({
          classNo,
          description: typeof candidate.description === 'string' ? candidate.description : undefined
        });
      }
    }
  }

  return classes;
};

const hasAgentData = (agent: Record<string, string | null | undefined>): boolean =>
  Object.values(agent).some((value) => typeof value === 'string' && value.trim().length > 0);

router.get('/trash', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT id, mark_name as name, deleted_at, status, jurisdiction
      FROM trademark_cases 
      WHERE deleted_at IS NOT NULL
      ORDER BY deleted_at DESC
    `);
    res.json(rows);
  } catch (error) {
    logRouteError(req, 'cases.trash', error);
    sendApiError(req, res, 500, { code: 'TRASH_FETCH_FAILED', message: 'Failed to fetch trash' });
  }
});

router.post('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE trademark_cases SET deleted_at = NULL WHERE id = ?',
      [req.params.id]
    ) as [ResultSetHeader, unknown[]];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Case not found in trash' });
    }
    res.json({ success: true, message: 'Case restored' });
  } catch (error) {
    logRouteError(req, 'cases.restore', error);
    sendApiError(req, res, 500, { code: 'RESTORE_FAILED', message: 'Failed to restore case' });
  }
});

router.delete('/:id/permanent', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM trademark_cases WHERE id = ? AND deleted_at IS NOT NULL',
      [req.params.id]
    ) as [ResultSetHeader, unknown[]];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Case not found in trash or already purged' });
    }
    res.json({ success: true, message: 'Case permanently deleted' });
  } catch (error) {
    logRouteError(req, 'cases.permanentDelete', error);
    sendApiError(req, res, 500, { code: 'DELETE_FAILED', message: 'Failed to purge case' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'UPDATE trademark_cases SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    ) as [ResultSetHeader, unknown[]];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Case not found or already deleted' });
    }
    res.json({ success: true, message: 'Case moved to trash' });
  } catch (error) {
    logRouteError(req, 'cases.delete', error);
    sendApiError(req, res, 500, { code: 'DELETE_FAILED', message: 'Failed to delete case' });
  }
});

router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendApiError(req, res, 400, { code: 'INVALID_IDS', message: 'Invalid or empty ids array' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const [result] = await pool.execute(
      `UPDATE trademark_cases SET deleted_at = NOW() WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      ids
    ) as [ResultSetHeader, unknown[]];

    res.json({ success: true, deleted: result.affectedRows, message: `${result.affectedRows} case(s) moved to trash` });
  } catch (error) {
    logRouteError(req, 'cases.bulkDelete', error);
    sendApiError(req, res, 500, { code: 'BULK_DELETE_FAILED', message: 'Failed to bulk delete cases' });
  }
});

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
    const cases = await caseQueryService.listCases({ q, status, jurisdiction });
    res.json(cases);
  } catch (error) {
    logRouteError(req, 'cases.list', error);
    sendApiError(req, res, 500, {
      code: 'CASES_FETCH_FAILED',
      message: 'Failed to fetch cases'
    });
  }
});

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

router.post('/', authenticateToken, async (req, res) => {
  const parsed = createCasePayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendApiError(req, res, 400, {
      code: 'INVALID_CASE_PAYLOAD',
      message: 'Invalid case payload',
      details: parsed.error.flatten()
    });
  }

  const data = parsed.data;
  const payload = data as Record<string, unknown>;
  const userId = req.user?.id ?? null;
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    const applicantName = getString(payload, ['applicantName', 'applicant_name_english']) || 'Unknown Applicant';
    const applicantLocalName = getOptionalString(payload, ['applicantNameAmharic', 'applicant_name_amharic']);
    const applicantType = mapApplicantType(payload);
    const applicantGender = mapApplicantGender(payload);
    const applicantNationality = getOptionalString(payload, ['nationality']);
    const applicantResidence = getOptionalString(payload, ['residence_country']);
    const applicantEmail = getOptionalString(payload, ['email']);
    const applicantStreet = getOptionalString(payload, ['addressStreet', 'address_street']);
    const applicantZone = getOptionalString(payload, ['addressZone', 'address_zone']);
    const applicantWereda = getOptionalString(payload, ['wereda']);
    const applicantCity = getOptionalString(payload, ['city', 'city_name']);
    const applicantStateName = getOptionalString(payload, ['state', 'state_name']);
    const applicantCityCode = getOptionalString(payload, ['city_code']);
    const applicantStateCode = getOptionalString(payload, ['state_code']);
    const applicantHouseNo = getOptionalString(payload, ['houseNo', 'house_no']);
    const applicantZip = getOptionalString(payload, ['zipCode', 'zip_code']);
    const applicantPoBox = getOptionalString(payload, ['poBox', 'po_box']);
    const applicantTelephone = getOptionalString(payload, ['telephone']);
    const applicantFax = getOptionalString(payload, ['fax']);

    let clientId = data.clientId;
    if (!clientId) {
      if (!applicantName) {
        return sendApiError(req, res, 400, {
          code: 'MISSING_APPLICANT',
          message: 'Applicant Name is required when no Client ID is provided'
        });
      }

      clientId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO clients (
          id, name, local_name, type, gender, nationality, residence_country, email,
          address_street, address_zone, wereda, city, state_name, city_code, state_code,
          house_no, zip_code, po_box, telephone, fax
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId,
          applicantName,
          applicantLocalName ?? null,
          applicantType,
          applicantGender,
          applicantNationality ?? null,
          applicantResidence ?? null,
          applicantEmail ?? null,
          applicantStreet ?? null,
          applicantZone ?? null,
          applicantWereda ?? null,
          applicantCity ?? null,
          applicantStateName ?? null,
          applicantCityCode ?? null,
          applicantStateCode ?? null,
          applicantHouseNo ?? null,
          applicantZip ?? null,
          applicantPoBox ?? null,
          applicantTelephone ?? null,
          applicantFax ?? null
        ]
      );
    } else {
      const [rows] = await connection.execute('SELECT id FROM clients WHERE id = ? LIMIT 1', [clientId]);
      const existing = rows as Array<{ id: string }>;
      if (existing.length === 0) {
        return sendApiError(req, res, 400, {
          code: 'INVALID_CLIENT_ID',
          message: 'Selected client does not exist'
        });
      }
    }

    const markDescription = getString(payload, ['markDescription', 'mark_description']);
    const markName = getString(payload, ['markName', 'mark_name']) || markDescription || 'New Mark';
    const { markType, isThreeDimensional } = mapMarkType(payload);
    const status = getString(payload, ['status']) || 'DRAFT';
    const normalizedStatus = CASE_STATUSES.has(status) ? status : 'DRAFT';
    const colorIndication = getOptionalString(payload, ['colorIndication', 'mark_color_indication']) ?? null;
    const translation = getOptionalString(payload, ['mark_translation', 'translation']) ?? null;
    const markTransliteration = getOptionalString(payload, ['mark_transliteration']) ?? null;
    const markLanguage = getOptionalString(payload, ['mark_language_requiring_traslation', 'mark_language_requiring_translation']) ?? null;
    const markThreeDimFeatures = getOptionalString(payload, ['mark_has_three_dim_features']) ?? null;

    const disclaimer_english = getOptionalString(payload, ['disclaimer_text_english', 'disclaimer_english']) ?? null;
    const disclaimer_amharic = getOptionalString(payload, ['disclaimer_text_amharic', 'disclaimer_amharic']) ?? null;

    const priority = mapPriority(payload);
    const priorityCountry = getOptionalString(payload, ['priorityCountry', 'priority_country']) ?? null;
    const priorityFilingDate = getDateString(payload, ['priority_filing_date', 'priority_application_filing_date']) ?? null;
    const goodsPrevApplication = getOptionalString(payload, ['goods_and_services_covered_by_the_previous_application', 'goods_prev_application']) ?? null;
    const priorityDeclaration = getOptionalString(payload, ['priority_right_declaration', 'priority_declaration']) ?? null;

    const clientInstructions = getOptionalString(payload, ['clientInstructions', 'client_instructions']) ?? null;
    const rawRemark = getOptionalString(payload, ['remark']);
    const otherDocuments = getOptionalString(payload, ['other_documents_text']);
    const remark = [rawRemark, otherDocuments ? `Other documents: ${otherDocuments}` : null]
      .filter((item): item is string => Boolean(item))
      .join('\n') || null;

    const chkListCopies = Boolean(getBoolean(payload, ['chk_list_copies']));
    const chkListStatus = Boolean(getBoolean(payload, ['chk_list_status', 'chk_list_statutes']));
    const chkListPoa = Boolean(getBoolean(payload, ['chk_list_poa']));
    const chkListPriorityDocs = Boolean(getBoolean(payload, ['chk_list_priority_docs']));
    const chkListDrawing = Boolean(getBoolean(payload, ['chk_list_drawing']));
    const chkListPayment = Boolean(getBoolean(payload, ['chk_list_payment']));
    const chkListOther = Boolean(getBoolean(payload, ['chk_list_other']));

    // Mark Type/Form flags from FormAutomation
    const isWord = Boolean(getBoolean(payload, ['mark_type_word', 'type_word']));
    const isFigurative = Boolean(getBoolean(payload, ['mark_type_figurative', 'type_figur']));
    const isMixed = Boolean(getBoolean(payload, ['mark_type_mixed', 'k_type_mi']));
    const isThreeDim = Boolean(getBoolean(payload, ['mark_type_three_dim', 'type_thre']));
    const chkGoods = Boolean(getBoolean(payload, ['chk_goods']));
    const chkServices = Boolean(getBoolean(payload, ['chk_services']));
    const chkCollective = Boolean(getBoolean(payload, ['chk_collective']));

    // Signature date fields
    const applicantSignDay = getOptionalString(payload, ['applicant_sign_day']) ?? null;
    const applicantSignMonth = getOptionalString(payload, ['applicant_sign_month']) ?? null;
    const applicantSignYearEn = getOptionalString(payload, ['applicant_sign_year_en']) ?? null;

    // Priority checklist fields
    const chkPriorityAccompanies = Boolean(getBoolean(payload, ['chk_priority_accompanies']));
    const chkPrioritySubmittedLater = Boolean(getBoolean(payload, ['chk_priority_submitted_later']));

    // Renewal fields
    const renewalAppNo = getOptionalString(payload, ['renewal_app_no']) ?? null;
    const renewalRegNo = getOptionalString(payload, ['renewal_reg_no']) ?? null;
    const renewalRegDate = getDateString(payload, ['renewal_reg_date']) ?? null;
    const renewalSignDay = getOptionalString(payload, ['renewal_sign_day']) ?? null;
    const renewalSignMonth = getOptionalString(payload, ['renewal_sign_month']) ?? null;
    const renewalSignYear = getOptionalString(payload, ['renewal_sign_year']) ?? null;

    const agentData = {
      name: getOptionalString(payload, ['agent_name']),
      country: getOptionalString(payload, ['agent_country']),
      city: getOptionalString(payload, ['agent_city']),
      subcity: getOptionalString(payload, ['agent_subcity']),
      woreda: getOptionalString(payload, ['agent_woreda', 'agent_wereda']),
      houseNo: getOptionalString(payload, ['agent_house_no']),
      telephone: getOptionalString(payload, ['agent_telephone']),
      email: getOptionalString(payload, ['agent_email']),
      poBox: getOptionalString(payload, ['agent_po_box']),
      fax: getOptionalString(payload, ['agent_fax'])
    };

    let agentId: string | null = null;
    if (hasAgentData(agentData)) {
      const agentName = agentData.name || 'Unnamed Agent';
      const agentCountry = agentData.country || 'Unknown';
      const agentCity = agentData.city || 'Unknown';
      const agentEmail = agentData.email || '';
      const agentTelephone = agentData.telephone || '';

      const [existingAgentRows] = await connection.execute(
        `SELECT id FROM agents
         WHERE name = ?
           AND COALESCE(email, '') = ?
           AND COALESCE(telephone, '') = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [agentName, agentEmail, agentTelephone]
      );

      const existingAgents = existingAgentRows as Array<{ id: string }>;
      if (existingAgents.length > 0) {
        agentId = existingAgents[0].id;
      } else {
        agentId = crypto.randomUUID();
        await connection.execute(
          `INSERT INTO agents (
            id, name, country, city, subcity, woreda, house_no, telephone, email, po_box, fax
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            agentId,
            agentName,
            agentCountry,
            agentCity,
            agentData.subcity ?? null,
            agentData.woreda ?? null,
            agentData.houseNo ?? null,
            agentData.telephone ?? null,
            agentData.email ?? null,
            agentData.poBox ?? null,
            agentData.fax ?? null
          ]
        );
      }
    }

    const rawMarkImage = getOptionalString(payload, ['markImage', 'mark_image', 'image_field']);
    const markImagePath = typeof rawMarkImage === 'string'
      ? saveMarkImageToUploads(rawMarkImage, applicantName, markName)
      : null;

    const newCaseId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO trademark_cases (
        id, jurisdiction, mark_name, mark_type, status, flow_stage,
        client_id, agent_id, user_id,
        color_indication, priority, priority_country, priority_filing_date,
        goods_prev_application, priority_declaration,
        client_instructions, remark,
        mark_image, mark_description,
        translation, mark_transliteration, mark_language_requiring_traslation,
        mark_has_three_dim_features, is_three_dimensional,
        disclaimer_english, disclaimer_amharic,
        chk_list_copies, chk_list_status, chk_list_poa, chk_list_priority_docs,
        chk_list_drawing, chk_list_payment, chk_list_other,
        is_word, is_figurative, is_mixed, is_three_dim,
        chk_goods, chk_services, chk_collective,
        representative_name,
        applicant_sign_day, applicant_sign_month, applicant_sign_year_en,
        chk_priority_accompanies, chk_priority_submitted_later,
        renewal_app_no, renewal_reg_no, renewal_reg_date,
        renewal_sign_day, renewal_sign_month, renewal_sign_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newCaseId,
        getString(payload, ['jurisdiction']) || 'ET',
        markName,
        markType,
        normalizedStatus,
        normalizedStatus === 'RENEWAL' ? 'RENEWAL_DUE' : 'DATA_COLLECTION',
        clientId,
        agentId,
        userId,
        colorIndication,
        priority,
        priorityCountry,
        priorityFilingDate,
        goodsPrevApplication,
        priorityDeclaration,
        clientInstructions,
        remark,
        markImagePath,
        markDescription || null,
        translation,
        markTransliteration,
        markLanguage,
        markThreeDimFeatures,
        isThreeDimensional,
        disclaimer_english,
        disclaimer_amharic,
        chkListCopies,
        chkListStatus,
        chkListPoa,
        chkListPriorityDocs,
        chkListDrawing,
        chkListPayment,
        chkListOther,
        isWord,
        isFigurative,
        isMixed,
        isThreeDim,
        chkGoods,
        chkServices,
        chkCollective,
        agentData.name || null,
        applicantSignDay,
        applicantSignMonth,
        applicantSignYearEn,
        chkPriorityAccompanies,
        chkPrioritySubmittedLater,
        renewalAppNo,
        renewalRegNo,
        renewalRegDate,
        renewalSignDay,
        renewalSignMonth,
        renewalSignYear
      ]
    );

    if (markImagePath) {
      await connection.execute(
        'INSERT INTO mark_assets (id, case_id, type, file_path, is_active) VALUES (?, ?, ?, ?, 1)',
        [crypto.randomUUID(), newCaseId, 'LOGO', markImagePath]
      );
    }

    const niceClasses = extractNiceClasses(payload);
    const goodsServicesDescription = collectGoodsServicesDescription(payload);
    if (niceClasses.length > 0) {
      for (const niceClass of niceClasses) {
        const description = (niceClass.description || goodsServicesDescription || '').trim();

        await connection.execute(
          'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
          [newCaseId, niceClass.classNo, description]
        );
      }
    }

    await connection.execute(
      `INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        crypto.randomUUID(),
        newCaseId,
        userId,
        'FORM_SUBMITTED',
        JSON.stringify({ status: 'NEW' }),
        JSON.stringify({
          status: normalizedStatus,
          applicantName,
          markName,
          hasMarkImage: Boolean(markImagePath)
        })
      ]
    );

    await connection.commit();
    res.status(201).json({ id: newCaseId, clientId, ...data });
  } catch (error) {
    await connection.rollback();
    logRouteError(req, 'cases.create', error);
    sendApiError(req, res, 500, {
      code: 'CASE_CREATE_FAILED',
      message: 'Failed to create case',
      details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    connection.release();
  }
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const parsedParams = caseIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_ID',
        message: 'Invalid case id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateCaseStatusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_STATUS_PAYLOAD',
        message: 'Invalid case status payload',
        details: parsedBody.error.flatten()
      });
    }

    const result = await caseLifecycleService.updateCaseStatus({
      caseId: parsedParams.data.id,
      status: parsedBody.data.status,
      userId: parsedBody.data.userId,
      actionNote: parsedBody.data.actionNote,
      publicationDate: parsedBody.data.publicationDate
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

router.patch('/:id/flow-stage', authenticateToken, async (req, res) => {
  try {
    const parsedParams = caseIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_ID',
        message: 'Invalid case id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateFlowStageSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_FLOW_STAGE_PAYLOAD',
        message: 'Invalid flow stage payload',
        details: parsedBody.error.flatten()
      });
    }

    const { stage, triggerDate, notes, ...extraData } = parsedBody.data;
    const result = await caseLifecycleService.advanceFlowStage({
      caseId: parsedParams.data.id,
      stage,
      triggerDate,
      notes,
      extraData,
      userId: req.user?.id
    });

    if (!result) {
      return sendApiError(req, res, 404, {
        code: 'CASE_NOT_FOUND',
        message: 'Case not found'
      });
    }

    res.json(result);
  } catch (error) {
    logRouteError(req, 'cases.advanceFlowStage', error);
    sendApiError(req, res, 500, {
      code: 'CASE_FLOW_STAGE_UPDATE_FAILED',
      message: 'Failed to update flow stage'
    });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = caseIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_ID',
        message: 'Invalid case id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateCaseSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_UPDATE_PAYLOAD',
        message: 'Invalid case update payload',
        details: parsedBody.error.flatten()
      });
    }

    const result = await caseLifecycleService.updateCase({
      caseId: parsedParams.data.id,
      payload: parsedBody.data
    });

    if (!result) {
      return sendApiError(req, res, 404, {
        code: 'CASE_NOT_FOUND',
        message: 'Case not found'
      });
    }

    res.json(result);
  } catch (error) {
    logRouteError(req, 'cases.updateCase', error);
    sendApiError(req, res, 500, {
      code: 'CASE_UPDATE_FAILED',
      message: 'Failed to update trademark'
    });
  }
});

router.post('/:id/renewal', authenticateToken, async (req, res) => {
  try {
    const parsedParams = caseIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_ID',
        message: 'Invalid case id',
        details: parsedParams.error.flatten()
      });
    }

    const renewalSchema = z.object({
      renewal_app_no: z.string().optional(),
      renewal_reg_no: z.string().optional(),
      renewal_reg_date: z.string().optional(),
      renewal_sign_day: z.string().optional(),
      renewal_sign_month: z.string().optional(),
      renewal_sign_year: z.string().optional(),
      remark: z.string().optional(),
      clientInstructions: z.string().optional()
    });

    const parsedBody = renewalSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_RENEWAL_PAYLOAD',
        message: 'Invalid renewal payload',
        details: parsedBody.error.flatten()
      });
    }

    const connection = await getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT id, status FROM trademark_cases WHERE id = ? AND deleted_at IS NULL',
        [parsedParams.data.id]
      );
      const existing = rows as Array<{ id: string; status: string }>;
      
      if (existing.length === 0) {
        return sendApiError(req, res, 404, {
          code: 'CASE_NOT_FOUND',
          message: 'Case not found'
        });
      }

      const payload = parsedBody.data;
      const updates: string[] = [];
      const values: (string | null)[] = [];

      if (payload.renewal_app_no !== undefined) {
        updates.push('renewal_app_no = ?');
        values.push(payload.renewal_app_no || null);
      }
      if (payload.renewal_reg_no !== undefined) {
        updates.push('renewal_reg_no = ?');
        values.push(payload.renewal_reg_no || null);
      }
      if (payload.renewal_reg_date !== undefined) {
        updates.push('renewal_reg_date = ?');
        values.push(payload.renewal_reg_date || null);
      }
      if (payload.renewal_sign_day !== undefined) {
        updates.push('renewal_sign_day = ?');
        values.push(payload.renewal_sign_day || null);
      }
      if (payload.renewal_sign_month !== undefined) {
        updates.push('renewal_sign_month = ?');
        values.push(payload.renewal_sign_month || null);
      }
      if (payload.renewal_sign_year !== undefined) {
        updates.push('renewal_sign_year = ?');
        values.push(payload.renewal_sign_year || null);
      }
      if (payload.remark !== undefined) {
        updates.push('remark = ?');
        values.push(payload.remark || null);
      }
      if (payload.clientInstructions !== undefined) {
        updates.push('client_instructions = ?');
        values.push(payload.clientInstructions || null);
      }

      updates.push('status = ?');
      values.push('RENEWAL');
      updates.push('flow_stage = ?');
      values.push('RENEWAL_DUE');

      values.push(parsedParams.data.id);

      await connection.execute(
        `UPDATE trademark_cases SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      const userId = req.user?.id;
      if (userId) {
        await connection.execute(
          `INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            crypto.randomUUID(),
            parsedParams.data.id,
            userId,
            'RENEWAL_INITIATED',
            JSON.stringify({ status: existing[0].status }),
            JSON.stringify({ status: 'RENEWAL', renewal_app_no: payload.renewal_app_no, renewal_reg_no: payload.renewal_reg_no })
          ]
        );
      }

      res.json({ success: true, message: 'Renewal initiated successfully', caseId: parsedParams.data.id });
    } finally {
      connection.release();
    }
  } catch (error) {
    logRouteError(req, 'cases.renewal', error);
    sendApiError(req, res, 500, {
      code: 'RENEWAL_FAILED',
      message: 'Failed to initiate renewal'
    });
  }
});

export default router;
