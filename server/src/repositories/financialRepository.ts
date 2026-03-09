import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../database/db.js';

export interface PaymentInsert {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface InvoiceInsert {
  id: string;
  clientId: string;
  invoiceNumber: string;
  dueDate: string | Date;
  currency: string;
  totalAmount: number;
  notes: string;
}

export interface InvoiceItemInsert {
  id: string;
  invoiceId: string;
  caseId?: string | null;
  description: string;
  category: string;
  amount: number;
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
};

export const financialRepository = {
  async insertPayment(connection: PoolConnection, payment: PaymentInsert): Promise<void> {
    await connection.execute(
      `INSERT INTO payments (id, invoice_id, amount, payment_date, payment_method, reference_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.invoiceId,
        payment.amount,
        payment.paymentDate,
        payment.paymentMethod,
        payment.referenceNumber ?? null,
        payment.notes ?? null
      ]
    );
  },

  async getTotalPaidForInvoice(connection: PoolConnection, invoiceId: string): Promise<number> {
    const [rows] = await connection.execute('SELECT SUM(amount) as total_paid FROM payments WHERE invoice_id = ?', [invoiceId]);
    const paymentRows = rows as Array<RowDataPacket & { total_paid: unknown }>;
    return toNumber(paymentRows[0]?.total_paid);
  },

  async getInvoiceTotalAmount(connection: PoolConnection, invoiceId: string): Promise<number | null> {
    const [rows] = await connection.execute('SELECT total_amount FROM invoices WHERE id = ?', [invoiceId]);
    const invoiceRows = rows as Array<RowDataPacket & { total_amount: unknown }>;
    if (invoiceRows.length === 0) {
      return null;
    }
    return toNumber(invoiceRows[0].total_amount);
  },

  async updateInvoiceStatus(connection: PoolConnection, invoiceId: string, status: 'PARTIALLY_PAID' | 'PAID'): Promise<void> {
    await connection.execute('UPDATE invoices SET status = ? WHERE id = ?', [status, invoiceId]);
  },

  async listPaymentsForInvoice(invoiceId: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
      [invoiceId]
    );
    return rows as RowDataPacket[];
  },

  async getInvoiceCount(connection: PoolConnection): Promise<number> {
    const [rows] = await connection.execute('SELECT COUNT(*) as c FROM invoices');
    const countRows = rows as Array<RowDataPacket & { c: unknown }>;
    return toNumber(countRows[0]?.c);
  },

  async insertInvoice(connection: PoolConnection, invoice: InvoiceInsert): Promise<void> {
    await connection.execute(
      `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
       VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, 'DRAFT')`,
      [
        invoice.id,
        invoice.clientId,
        invoice.invoiceNumber,
        invoice.dueDate,
        invoice.currency,
        invoice.totalAmount,
        invoice.notes
      ]
    );
  },

  async insertInvoiceItem(connection: PoolConnection, item: InvoiceItemInsert): Promise<void> {
    await connection.execute(
      `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [item.id, item.invoiceId, item.caseId ?? null, item.description, item.category, item.amount]
    );
  },

  async listInvoices(): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(`
      SELECT i.*, c.name as client_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      ORDER BY i.created_at DESC
    `);
    return rows as RowDataPacket[];
  }
};
