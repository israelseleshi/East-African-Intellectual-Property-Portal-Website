import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
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

// Record a new payment
router.post('/payments', authenticateToken, async (req, res) => {
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
router.get('/payments/invoice/:invoiceId', authenticateToken, async (req, res) => {
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

router.post('/invoices', authenticateToken, async (req, res) => {
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

router.get('/invoices', authenticateToken, async (req, res) => {
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

export default router;
