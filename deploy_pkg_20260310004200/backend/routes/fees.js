import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { feeService } from '../services/feeService.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
const router = express.Router();
const listFeeQuerySchema = z.object({
    jurisdiction: z.string().optional(),
    stage: z.string().optional(),
    category: z.string().optional(),
    active: z.enum(['true', 'false']).optional()
});
const calculateParamsSchema = z.object({
    jurisdiction: z.string().min(1),
    stage: z.string().min(1)
});
const caseIdParamsSchema = z.object({
    caseId: z.string().min(1)
});
const createFeeSchema = z.object({
    jurisdiction: z.string().min(1),
    stage: z.string().min(1),
    category: z.string().min(1),
    amount: z.coerce.number().nonnegative(),
    currency: z.string().optional(),
    effectiveDate: z.string().optional(),
    expiryDate: z.string().nullable().optional(),
    description: z.string().nullable().optional()
});
const updateFeeParamsSchema = z.object({
    id: z.string().min(1)
});
const updateFeeBodySchema = z.object({
    amount: z.coerce.number().nonnegative().optional(),
    currency: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    expiry_date: z.string().nullable().optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: 'No valid fields to update'
});
const deleteFeeQuerySchema = z.object({
    permanent: z.enum(['true', 'false']).optional()
});
const compareParamsSchema = z.object({
    stage: z.string().min(1)
});
const compareQuerySchema = z.object({
    category: z.string().optional()
});
router.get('/', authenticateToken, async (req, res) => {
    try {
        const parsed = listFeeQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_QUERY',
                message: 'Invalid fee query',
                details: parsed.error.flatten()
            });
        }
        const rows = await feeService.listFeeSchedules({
            jurisdiction: parsed.data.jurisdiction,
            stage: parsed.data.stage,
            category: parsed.data.category,
            active: parsed.data.active === 'true'
        });
        res.json(rows);
    }
    catch (error) {
        logRouteError(req, 'fees.list', error);
        sendApiError(req, res, 500, {
            code: 'FEE_SCHEDULES_FETCH_FAILED',
            message: 'Failed to fetch fee schedules'
        });
    }
});
router.get('/calculate/:jurisdiction/:stage', authenticateToken, async (req, res) => {
    try {
        const parsed = calculateParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_CALC_PARAMS',
                message: 'Invalid fee calculation parameters',
                details: parsed.error.flatten()
            });
        }
        const result = await feeService.calculateFees(parsed.data.jurisdiction, parsed.data.stage);
        if (!result) {
            return sendApiError(req, res, 404, {
                code: 'FEE_NOT_FOUND',
                message: 'No fees found for this jurisdiction and stage',
                details: parsed.data
            });
        }
        res.json(result);
    }
    catch (error) {
        logRouteError(req, 'fees.calculate', error);
        sendApiError(req, res, 500, {
            code: 'FEE_CALCULATION_FAILED',
            message: 'Failed to calculate fees'
        });
    }
});
router.get('/case/:caseId', authenticateToken, async (req, res) => {
    try {
        const parsed = caseIdParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_CASE_ID',
                message: 'Invalid case id',
                details: parsed.error.flatten()
            });
        }
        const result = await feeService.calculateCaseFees(parsed.data.caseId);
        if (!result) {
            return sendApiError(req, res, 404, {
                code: 'CASE_NOT_FOUND',
                message: 'Case not found'
            });
        }
        res.json(result);
    }
    catch (error) {
        logRouteError(req, 'fees.calculateCaseFees', error);
        sendApiError(req, res, 500, {
            code: 'CASE_FEE_CALCULATION_FAILED',
            message: 'Failed to calculate case fees'
        });
    }
});
router.post('/', authenticateToken, async (req, res) => {
    try {
        const parsed = createFeeSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_CREATE_PAYLOAD',
                message: 'Invalid fee schedule payload',
                details: parsed.error.flatten()
            });
        }
        const result = await feeService.createFeeSchedule({
            jurisdiction: parsed.data.jurisdiction,
            stage: parsed.data.stage,
            category: parsed.data.category,
            amount: parsed.data.amount,
            currency: parsed.data.currency || 'USD',
            effectiveDate: parsed.data.effectiveDate || new Date(),
            expiryDate: parsed.data.expiryDate ?? null,
            description: parsed.data.description ?? null,
            createdBy: req.user?.id ?? null
        });
        res.status(201).json(result);
    }
    catch (error) {
        const typedError = error;
        if (typedError.code === 'ER_DUP_ENTRY') {
            return sendApiError(req, res, 409, {
                code: 'FEE_SCHEDULE_DUPLICATE',
                message: 'Fee schedule already exists for this jurisdiction, stage, category, and effective date'
            });
        }
        logRouteError(req, 'fees.create', error);
        sendApiError(req, res, 500, {
            code: 'FEE_CREATE_FAILED',
            message: 'Failed to create fee schedule'
        });
    }
});
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const parsedParams = updateFeeParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_ID',
                message: 'Invalid fee schedule id',
                details: parsedParams.error.flatten()
            });
        }
        const parsedBody = updateFeeBodySchema.safeParse(req.body);
        if (!parsedBody.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_UPDATE_PAYLOAD',
                message: 'Invalid fee update payload',
                details: parsedBody.error.flatten()
            });
        }
        const updated = await feeService.updateFeeSchedule(parsedParams.data.id, parsedBody.data);
        if (!updated) {
            return sendApiError(req, res, 404, {
                code: 'FEE_SCHEDULE_NOT_FOUND',
                message: 'Fee schedule not found'
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        logRouteError(req, 'fees.update', error);
        sendApiError(req, res, 500, {
            code: 'FEE_UPDATE_FAILED',
            message: 'Failed to update fee schedule'
        });
    }
});
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const parsedParams = updateFeeParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_ID',
                message: 'Invalid fee schedule id',
                details: parsedParams.error.flatten()
            });
        }
        const parsedQuery = deleteFeeQuerySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_FEE_DELETE_QUERY',
                message: 'Invalid fee delete query',
                details: parsedQuery.error.flatten()
            });
        }
        const permanent = parsedQuery.data.permanent === 'true';
        const deleted = await feeService.deleteFeeSchedule(parsedParams.data.id, permanent);
        if (!deleted) {
            return sendApiError(req, res, 404, {
                code: 'FEE_SCHEDULE_NOT_FOUND',
                message: 'Fee schedule not found'
            });
        }
        res.json({
            success: true,
            message: permanent ? 'Fee schedule permanently deleted' : 'Fee schedule moved to trash'
        });
    }
    catch (error) {
        logRouteError(req, 'fees.delete', error);
        sendApiError(req, res, 500, {
            code: 'FEE_DELETE_FAILED',
            message: 'Failed to delete fee schedule'
        });
    }
});
router.get('/compare/:stage', authenticateToken, async (req, res) => {
    try {
        const parsedParams = compareParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_COMPARE_STAGE',
                message: 'Invalid stage for fee comparison',
                details: parsedParams.error.flatten()
            });
        }
        const parsedQuery = compareQuerySchema.safeParse(req.query);
        if (!parsedQuery.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_COMPARE_QUERY',
                message: 'Invalid comparison query',
                details: parsedQuery.error.flatten()
            });
        }
        const result = await feeService.compareFees(parsedParams.data.stage, parsedQuery.data.category || 'OFFICIAL_FEE');
        res.json(result);
    }
    catch (error) {
        logRouteError(req, 'fees.compare', error);
        sendApiError(req, res, 500, {
            code: 'FEE_COMPARE_FAILED',
            message: 'Failed to compare fees'
        });
    }
});
export default router;
