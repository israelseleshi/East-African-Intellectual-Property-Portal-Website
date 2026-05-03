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

export interface InvoiceUpdate {
  currency?: string;
  dueDate?: string;
  notes?: string;
  status?: string;
  totalAmount?: number;
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

  async getNextInvoiceNumber(connection: PoolConnection): Promise<string> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prefix = today;
    
    const [rows] = await connection.execute(
      'SELECT COUNT(*) as count FROM invoices WHERE DATE(issue_date) = CURDATE()'
    );
    const count = (rows as any)[0]?.count || 0;
    const sequence = String(count + 1).padStart(3, '0');
    
    return `${prefix}-${sequence}`;
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
      SELECT i.*, c.name as client_name,
             tc.id as trademark_id,
             tc.mark_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id AND ii.deleted_at IS NULL
      LEFT JOIN trademark_cases tc ON tc.id = ii.case_id
      WHERE i.deleted_at IS NULL
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);
    return rows as RowDataPacket[];
  },

  async getInvoiceById(invoiceId: string, includeDeleted = false): Promise<RowDataPacket | null> {
    const deletedClause = includeDeleted ? '' : 'AND i.deleted_at IS NULL';
    const [rows] = await pool.execute(
      `SELECT i.*, c.name AS client_name,
              tc.id AS trademark_id,
              tc.mark_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       LEFT JOIN invoice_items ii ON ii.invoice_id = i.id ${includeDeleted ? '' : 'AND ii.deleted_at IS NULL'}
       LEFT JOIN trademark_cases tc ON tc.id = ii.case_id
       WHERE i.id = ? ${deletedClause}
       ORDER BY ii.id ASC
       LIMIT 1`,
      [invoiceId]
    );
    const data = (rows as RowDataPacket[])[0];
    return data || null;
  },

  async listInvoiceItems(invoiceId: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(
      `SELECT ii.*
       FROM invoice_items ii
       WHERE ii.invoice_id = ? AND ii.deleted_at IS NULL
       ORDER BY ii.id ASC`,
      [invoiceId]
    );
    return rows as RowDataPacket[];
  },

  async updateInvoice(connection: PoolConnection, invoiceId: string, updates: InvoiceUpdate): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number> = [];

    if (updates.currency !== undefined) {
      fields.push('currency = ?');
      values.push(updates.currency);
    }
    if (updates.dueDate !== undefined) {
      fields.push('due_date = ?');
      values.push(updates.dueDate);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.totalAmount !== undefined) {
      fields.push('total_amount = ?');
      values.push(updates.totalAmount);
    }

    if (fields.length === 0) return;

    values.push(invoiceId);
    await connection.execute(
      `UPDATE invoices SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
      values
    );
  },

  async softDeleteInvoice(connection: PoolConnection, invoiceId: string): Promise<void> {
    await connection.execute('UPDATE invoice_items SET deleted_at = NOW() WHERE invoice_id = ? AND deleted_at IS NULL', [invoiceId]);
    await connection.execute('UPDATE invoices SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [invoiceId]);
  },

  async replaceInvoiceItems(connection: PoolConnection, invoiceId: string, items: InvoiceItemInsert[]): Promise<void> {
    await connection.execute('UPDATE invoice_items SET deleted_at = NOW() WHERE invoice_id = ? AND deleted_at IS NULL', [invoiceId]);

    for (const item of items) {
      await connection.execute(
        `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, invoiceId, item.caseId ?? null, item.description, item.category, item.amount]
      );
    }
  },

  async restoreInvoice(invoiceId: string): Promise<void> {
    await pool.execute('UPDATE invoice_items SET deleted_at = NULL WHERE invoice_id = ?', [invoiceId]);
    await pool.execute('UPDATE invoices SET deleted_at = NULL WHERE id = ?', [invoiceId]);
  },

  async listDeletedInvoices(): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(`
      SELECT i.*, c.name as client_name,
             tc.id as trademark_id,
             tc.mark_name
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
      LEFT JOIN trademark_cases tc ON tc.id = ii.case_id
      WHERE i.deleted_at IS NOT NULL
      GROUP BY i.id
      ORDER BY i.deleted_at DESC
    `);
    return rows as RowDataPacket[];
  }
};
