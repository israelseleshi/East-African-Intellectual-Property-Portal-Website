import { pool } from '../database/db.js';
const toNumber = (value) => {
    if (typeof value === 'number')
        return value;
    if (typeof value === 'string' && value.trim() !== '')
        return Number(value);
    return 0;
};
export const financialRepository = {
    async insertPayment(connection, payment) {
        await connection.execute(`INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            payment.id,
            payment.invoiceId,
            payment.amount,
            payment.paymentDate,
            payment.paymentMethod,
            payment.referenceNumber ?? null,
            payment.notes ?? null
        ]);
    },
    async getTotalPaidForInvoice(connection, invoiceId) {
        const [rows] = await connection.execute('SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?', [invoiceId]);
        const paymentRows = rows;
        return toNumber(paymentRows[0]?.total_paid);
    },
    async getInvoiceTotalAmount(connection, invoiceId) {
        const [rows] = await connection.execute('SELECT total_amount FROM invoices WHERE id = ?', [invoiceId]);
        const invoiceRows = rows;
        if (invoiceRows.length === 0) {
            return null;
        }
        return toNumber(invoiceRows[0].total_amount);
    },
    async updateInvoiceStatus(connection, invoiceId, status) {
        await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, invoiceId]);
    },
    async listPaymentsForInvoice(invoiceId) {
        const [rows] = await pool.execute('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC', [invoiceId]);
        return rows;
    },
    async getInvoiceCount(connection) {
        const [rows] = await connection.execute('SELECT COUNT(*) as c FROM invoices');
        const countRows = rows;
        return toNumber(countRows[0]?.c);
    },
    async insertInvoice(connection, invoice) {
        await connection.execute(`INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'DRAFT')`, [
            invoice.id,
            invoice.clientId,
            invoice.invoiceNumber,
            invoice.dueDate,
            invoice.currency,
            invoice.totalAmount,
            invoice.notes
        ]);
    },
    async insertInvoiceItem(connection, item) {
        await connection.execute(`INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
       VALUES (?, ?, ?, ?, ?, ?)`, [item.id, item.invoiceId, item.caseId ?? null, item.description, item.category, item.amount]);
    },
    async listInvoices() {
        const [rows] = await pool.execute(`
      SELECT i.*, c.name as client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
    `);
        return rows;
    }
};
