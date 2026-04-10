import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin } from '../middleware/superAdmin.js';
import { financialService } from '../services/financialService.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const paymentPayloadSchema = z.object({
    invoiceId: z.string().min(1),
    amount: z.coerce.number().positive(),
    paymentDate: z.string().min(1),
    paymentMethod: z.string().min(1),
    referenceNumber: z.string().optional(),
    notes: z.string().optional()
});

const paymentsByInvoiceParamsSchema = z.object({
    invoiceId: z.string().min(1)
});

const invoiceIdParamsSchema = z.object({
    id: z.string().min(1)
});

const invoiceItemSchema = z.object({
    caseId: z.string().optional(),
    description: z.string().min(1),
    category: z.string().min(1),
    amount: z.coerce.number().positive()
});

const createInvoicePayloadSchema = z.object({
    clientId: z.string().min(1),
    items: z.array(invoiceItemSchema).min(1),
    currency: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional()
});

const updateInvoicePayloadSchema = z.object({
    items: z.array(invoiceItemSchema).min(1).optional(),
    currency: z.string().optional(),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    status: z.string().optional()
});

// Record a new payment
router.post('/payments', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsed = paymentPayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_PAYMENT_PAYLOAD',
                message: 'Invalid payment payload',
                details: parsed.error.flatten()
            });
        }

        const result = await financialService.recordPayment(parsed.data);
        res.status(201).json(result);
    } catch (error) {
        logRouteError(req, 'financials.recordPayment', error);
        sendApiError(req, res, 500, {
            code: 'PAYMENT_RECORD_FAILED',
            message: 'Failed to record payment'
        });
    }
});

// Get payments for an invoice
router.get('/payments/invoice/:invoiceId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsed = paymentsByInvoiceParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_ID',
                message: 'Invalid invoice id',
                details: parsed.error.flatten()
            });
        }

        const rows = await financialService.listPaymentsForInvoice(parsed.data.invoiceId);
        res.json(rows);
    } catch (error) {
        logRouteError(req, 'financials.listPaymentsForInvoice', error);
        sendApiError(req, res, 500, {
            code: 'PAYMENTS_FETCH_FAILED',
            message: 'Failed to fetch payments'
        });
    }
});

router.post('/invoices', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsed = createInvoicePayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_PAYLOAD',
                message: 'Invalid invoice payload',
                details: parsed.error.flatten()
            });
        }

        const result = await financialService.createInvoice(parsed.data);
        res.json(result);
    } catch (error) {
        logRouteError(req, 'financials.createInvoice', error);
        sendApiError(req, res, 500, {
            code: 'INVOICE_CREATE_FAILED',
            message: 'Failed to create invoice'
        });
    }
});

router.get('/invoices', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const rows = await financialService.listInvoices();
        res.json(rows);
    } catch (error) {
        logRouteError(req, 'financials.listInvoices', error);
        sendApiError(req, res, 500, {
            code: 'INVOICES_FETCH_FAILED',
            message: 'Failed to fetch invoices'
        });
    }
});

router.get('/invoices/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsed = invoiceIdParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_ID',
                message: 'Invalid invoice id',
                details: parsed.error.flatten()
            });
        }

        const invoice = await financialService.getInvoiceById(parsed.data.id);
        if (!invoice) {
            return sendApiError(req, res, 404, {
                code: 'INVOICE_NOT_FOUND',
                message: 'Invoice not found'
            });
        }

        res.json(invoice);
    } catch (error) {
        logRouteError(req, 'financials.getInvoiceById', error);
        sendApiError(req, res, 500, {
            code: 'INVOICE_FETCH_FAILED',
            message: 'Failed to fetch invoice'
        });
    }
});

router.patch('/invoices/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsedParams = invoiceIdParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_ID',
                message: 'Invalid invoice id',
                details: parsedParams.error.flatten()
            });
        }

        const parsedBody = updateInvoicePayloadSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_UPDATE_PAYLOAD',
                message: 'Invalid invoice update payload',
                details: parsedBody.error.flatten()
            });
        }

        const updated = await financialService.updateInvoice({
            id: parsedParams.data.id,
            ...parsedBody.data
        });

        if (!updated) {
            return sendApiError(req, res, 404, {
                code: 'INVOICE_NOT_FOUND',
                message: 'Invoice not found'
            });
        }

        res.json(updated);
    } catch (error) {
        logRouteError(req, 'financials.updateInvoice', error);
        sendApiError(req, res, 500, {
            code: 'INVOICE_UPDATE_FAILED',
            message: 'Failed to update invoice'
        });
    }
});

router.delete('/invoices/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const parsed = invoiceIdParamsSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_INVOICE_ID',
                message: 'Invalid invoice id',
                details: parsed.error.flatten()
            });
        }

        const result = await financialService.deleteInvoice(parsed.data.id);
        res.json(result);
    } catch (error) {
        logRouteError(req, 'financials.deleteInvoice', error);
        sendApiError(req, res, 500, {
            code: 'INVOICE_DELETE_FAILED',
            message: 'Failed to delete invoice'
        });
    }
});

export default router;
