import express from 'express';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
const router = express.Router();
const codeParamSchema = z.object({ code: z.string().min(1) });
const calculateDeadlinesSchema = z.object({
    triggerDate: z.string().optional(),
    stage: z.string().min(1)
});
const createJurisdictionSchema = z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    country_code: z.string().optional(),
    opposition_period_days: z.coerce.number().int().positive().optional(),
    renewal_period_years: z.coerce.number().int().positive().optional(),
    grace_period_months: z.coerce.number().int().nonnegative().optional(),
    currency_code: z.string().optional(),
    requires_power_of_attorney: z.boolean().optional(),
    requires_notarization: z.boolean().optional(),
    multi_class_filing_allowed: z.boolean().optional(),
    rules_summary: z.string().nullable().optional(),
    official_language: z.string().nullable().optional()
});
const updateJurisdictionSchema = z.object({
    name: z.string().optional(),
    opposition_period_days: z.coerce.number().int().positive().optional(),
    renewal_period_years: z.coerce.number().int().positive().optional(),
    grace_period_months: z.coerce.number().int().nonnegative().optional(),
    currency_code: z.string().optional(),
    requires_power_of_attorney: z.boolean().optional(),
    requires_notarization: z.boolean().optional(),
    multi_class_filing_allowed: z.boolean().optional(),
    rules_summary: z.string().nullable().optional(),
    official_language: z.string().nullable().optional(),
    is_active: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: 'No valid fields to update'
});
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM jurisdictions WHERE is_active = TRUE ORDER BY name');
        res.json(rows);
    }
    catch (error) {
        logRouteError(req, 'jurisdictions.list', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTIONS_FETCH_FAILED',
            message: 'Failed to fetch jurisdictions'
        });
    }
});
router.get('/:code', authenticateToken, async (req, res) => {
    try {
        const parsed = codeParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_CODE',
                message: 'Invalid jurisdiction code',
                details: parsed.error.flatten()
            });
        }
        const [rows] = await pool.execute('SELECT * FROM jurisdictions WHERE code = ? AND is_active = TRUE', [parsed.data.code]);
        if (rows.length === 0) {
            return sendApiError(req, res, 404, {
                code: 'JURISDICTION_NOT_FOUND',
                message: 'Jurisdiction not found'
            });
        }
        res.json(rows[0]);
    }
    catch (error) {
        logRouteError(req, 'jurisdictions.getByCode', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTION_FETCH_FAILED',
            message: 'Failed to fetch jurisdiction'
        });
    }
});
router.get('/:code/rules', authenticateToken, async (req, res) => {
    try {
        const parsed = codeParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_CODE',
                message: 'Invalid jurisdiction code',
                details: parsed.error.flatten()
            });
        }
        const [rows] = await pool.execute(`SELECT code, name, opposition_period_days, renewal_period_years,
              grace_period_months, currency_code, requires_power_of_attorney,
              requires_notarization, multi_class_filing_allowed, rules_summary
       FROM jurisdictions WHERE code = ? AND is_active = TRUE`, [parsed.data.code]);
        if (rows.length === 0) {
            return sendApiError(req, res, 404, {
                code: 'JURISDICTION_NOT_FOUND',
                message: 'Jurisdiction not found'
            });
        }
        res.json(rows[0]);
    }
    catch (error) {
        logRouteError(req, 'jurisdictions.rules', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTION_RULES_FETCH_FAILED',
            message: 'Failed to fetch jurisdiction rules'
        });
    }
});
router.post('/:code/calculate-deadlines', authenticateToken, async (req, res) => {
    try {
        const parsedParams = codeParamSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_CODE',
                message: 'Invalid jurisdiction code',
                details: parsedParams.error.flatten()
            });
        }
        const parsedBody = calculateDeadlinesSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_DEADLINE_CALC_PAYLOAD',
                message: 'Invalid deadline calculation payload',
                details: parsedBody.error.flatten()
            });
        }
        const [rows] = await pool.execute('SELECT opposition_period_days, renewal_period_years FROM jurisdictions WHERE code = ?', [parsedParams.data.code]);
        if (rows.length === 0) {
            return sendApiError(req, res, 404, {
                code: 'JURISDICTION_NOT_FOUND',
                message: 'Jurisdiction not found'
            });
        }
        const rules = rows[0];
        const baseDate = parsedBody.data.triggerDate ? new Date(parsedBody.data.triggerDate) : new Date();
        const deadlines = {};
        switch (parsedBody.data.stage) {
            case 'PUBLISHED':
                deadlines.opposition_deadline = new Date(baseDate);
                deadlines.opposition_deadline.setDate(baseDate.getDate() + rules.opposition_period_days);
                break;
            case 'REGISTERED':
                deadlines.renewal_due = new Date(baseDate);
                deadlines.renewal_due.setFullYear(baseDate.getFullYear() + rules.renewal_period_years);
                break;
            default:
                break;
        }
        res.json({
            jurisdiction: parsedParams.data.code,
            stage: parsedBody.data.stage,
            trigger_date: baseDate,
            deadlines,
            rules_applied: {
                opposition_period_days: rules.opposition_period_days,
                renewal_period_years: rules.renewal_period_years
            }
        });
    }
    catch (error) {
        logRouteError(req, 'jurisdictions.calculateDeadlines', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTION_DEADLINE_CALC_FAILED',
            message: 'Failed to calculate deadlines'
        });
    }
});
router.post('/', authenticateToken, async (req, res) => {
    try {
        const parsed = createJurisdictionSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_PAYLOAD',
                message: 'Invalid jurisdiction payload',
                details: parsed.error.flatten()
            });
        }
        const data = parsed.data;
        await pool.execute(`INSERT INTO jurisdictions (code, name, country_code, opposition_period_days,
       renewal_period_years, grace_period_months, currency_code, requires_power_of_attorney,
       requires_notarization, multi_class_filing_allowed, rules_summary, official_language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            data.code,
            data.name,
            data.country_code || null,
            data.opposition_period_days || 60,
            data.renewal_period_years || 10,
            data.grace_period_months || 6,
            data.currency_code || 'USD',
            data.requires_power_of_attorney !== false,
            data.requires_notarization || false,
            data.multi_class_filing_allowed !== false,
            data.rules_summary || null,
            data.official_language || null
        ]);
        res.status(201).json({ success: true, code: data.code });
    }
    catch (error) {
        const typedError = error;
        if (typedError.code === 'ER_DUP_ENTRY') {
            return sendApiError(req, res, 409, {
                code: 'JURISDICTION_DUPLICATE',
                message: 'Jurisdiction code already exists'
            });
        }
        logRouteError(req, 'jurisdictions.create', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTION_CREATE_FAILED',
            message: 'Failed to create jurisdiction'
        });
    }
});
router.patch('/:code', authenticateToken, async (req, res) => {
    try {
        const parsedParams = codeParamSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_CODE',
                message: 'Invalid jurisdiction code',
                details: parsedParams.error.flatten()
            });
        }
        const parsedBody = updateJurisdictionSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_JURISDICTION_UPDATE_PAYLOAD',
                message: 'Invalid jurisdiction update payload',
                details: parsedBody.error.flatten()
            });
        }
        const updates = parsedBody.data;
        const fields = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(parsedParams.data.code);
        await pool.execute(`UPDATE jurisdictions SET ${fields}, updated_at = NOW() WHERE code = ?`, values);
        res.json({ success: true });
    }
    catch (error) {
        logRouteError(req, 'jurisdictions.update', error);
        sendApiError(req, res, 500, {
            code: 'JURISDICTION_UPDATE_FAILED',
            message: 'Failed to update jurisdiction'
        });
    }
});
export default router;
