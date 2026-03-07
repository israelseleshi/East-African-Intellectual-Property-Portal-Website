import express from 'express';
import crypto from 'crypto';
import { pool, getConnection } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/invoices', authenticateToken, async (req, res) => {
    try {
        const { clientId, items, currency, dueDate, notes } = req.body;

        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.execute('SELECT COUNT(*) as c FROM invoices') as unknown[];
            const count = (rows as Array<{ c: number }>)[0].c + 1;
            const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`;

            const totalAmount = items.reduce((sum: number, item: { amount: number }) => sum + Number(item.amount), 0);
            const invoiceId = crypto.randomUUID();

            await connection.execute(
                `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
         VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'DRAFT')`,
                [invoiceId, clientId, invoiceNumber, dueDate || new Date(), currency || 'USD', totalAmount, notes || '']
            );

            for (const item of items) {
                await connection.execute(
                    `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
           VALUES (?, ?, ?, ?, ?, ?)`,
                    [crypto.randomUUID(), invoiceId, item.caseId || null, item.description, item.category, item.amount]
                );
            }

            await connection.commit();
            res.json({ id: invoiceId, invoiceNumber, totalAmount, status: 'DRAFT' });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating invoice:', error);
        res.status(500).json({ error: 'Failed to create invoice' });
    }
});

router.get('/invoices', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(`
      SELECT i.*, c.name as client_name 
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
    `);
        res.json(rows);
    } catch {
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});

export default router;
