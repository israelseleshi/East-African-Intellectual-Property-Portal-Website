import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import { getConnection } from '../database/db.js';
import { CASE_FLOW_STAGES } from '../database/types.js';
import { authenticateToken } from '../middleware/auth.js';
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
    fax: z.string().optional(),
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
  goods_services: z.string().optional()
}).passthrough();

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
  const userId = req.user?.id ?? null;
  const connection = await getConnection();

  try {
    await connection.beginTransaction();

    let clientId = data.clientId;
    if (!clientId) {
      if (!data.applicantName) {
        return sendApiError(req, res, 400, {
          code: 'MISSING_APPLICANT',
          message: 'Applicant Name is required when no Client ID is provided'
        });
      }

      clientId = crypto.randomUUID();
      await connection.execute(
        'INSERT INTO clients (id, name, type, nationality, email, address_street, city, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          clientId,
          data.applicantName,
          data.applicantType || 'COMPANY',
          data.nationality || null,
          data.email || null,
          data.addressStreet || null,
          data.city || null,
          data.zipCode || null
        ]
      );
    }

    const newCaseId = crypto.randomUUID();
    await connection.execute(
      'INSERT INTO trademark_cases (id, jurisdiction, mark_name, mark_type, status, flow_stage, client_id, user_id, color_indication, priority, client_instructions, remark, mark_image, mark_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        newCaseId,
        data.jurisdiction || 'ET',
        data.markName || data.markDescription || 'New Mark',
        data.markType || 'WORD',
        data.status || 'DRAFT',
        'DATA_COLLECTION',
        clientId,
        userId,
        data.colorIndication || 'Black & White',
        data.priority || 'NO',
        data.clientInstructions || null,
        data.remark || null,
        data.markImage || null,
        data.markDescription || null
      ]
    );

    if (data.niceClasses && data.niceClasses.length > 0) {
      for (const niceClass of data.niceClasses) {
        const classNo = typeof niceClass === 'number' ? niceClass : niceClass.classNo;
        const description = typeof niceClass === 'number'
          ? (data.goodsServicesDescription || '')
          : (niceClass.description || data.goodsServicesDescription || '');

        await connection.execute(
          'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
          [newCaseId, classNo, description]
        );
      }
    }

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

export default router;
