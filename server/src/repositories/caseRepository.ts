import crypto from 'crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { pool } from '../database/db.js';
import type { CaseRow } from '../database/types.js';

export interface CaseSearchFilters {
  q?: string;
  status?: string;
  jurisdiction?: string;
}

export interface DeadlineRow extends RowDataPacket {
  case_id: string;
  [key: string]: unknown;
}

export interface CaseDetailRow extends RowDataPacket {
  client_id_ref: string;
  client_name: string;
  client_type: string;
  client_nationality: string | null;
  client_email: string | null;
  client_address_street: string | null;
  client_city: string | null;
  client_zip_code: string | null;
  client_telephone: string | null;
  client_fax: string | null;
  eipa_form_json?: unknown;
  [key: string]: unknown;
}

export interface NiceMappingRow extends RowDataPacket {
  classNo: number;
  description: string | null;
}

const normalizeSearchFilters = (filters: CaseSearchFilters) => ({
  q: typeof filters.q === 'string' ? filters.q.trim() : '',
  status: typeof filters.status === 'string' ? filters.status.trim() : '',
  jurisdiction: typeof filters.jurisdiction === 'string' ? filters.jurisdiction.trim() : ''
});

export const caseRepository = {
  async findCases(filters: CaseSearchFilters): Promise<CaseRow[]> {
    const normalized = normalizeSearchFilters(filters);
    let sql = `
      SELECT tc.*, c.name as client_name, c.type as client_type
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (normalized.status && normalized.status !== 'ALL') {
      sql += ' AND tc.status = ?';
      params.push(normalized.status);
    }

    if (normalized.jurisdiction && normalized.jurisdiction !== 'ALL') {
      sql += ' AND tc.jurisdiction = ?';
      params.push(normalized.jurisdiction);
    }

    if (normalized.q) {
      const like = `%${normalized.q}%`;
      sql += ' AND (tc.mark_name LIKE ? OR tc.filing_number LIKE ? OR c.name LIKE ?)';
      params.push(like, like, like);
    }

    sql += ' ORDER BY tc.created_at DESC';
    const [rows] = await pool.execute(sql, params);
    return rows as CaseRow[];
  },

  async findDeadlinesByCaseIds(caseIds: string[]): Promise<DeadlineRow[]> {
    if (caseIds.length === 0) {
      return [];
    }

    const placeholders = caseIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM deadlines WHERE case_id IN (${placeholders}) ORDER BY due_date ASC`,
      caseIds
    );
    return rows as DeadlineRow[];
  },

  async findCaseWithClientById(caseId: string): Promise<CaseDetailRow | null> {
    const [rows] = await pool.execute(
      `
      SELECT tc.*,
        c.id as client_id_ref,
        c.name as client_name,
        c.type as client_type,
        c.nationality as client_nationality,
        c.email as client_email,
        c.address_street as client_address_street,
        c.city as client_city,
        c.zip_code as client_zip_code,
        c.telephone as client_telephone,
        c.fax as client_fax
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE tc.id = ?
      `,
      [caseId]
    );

    const caseRows = rows as CaseDetailRow[];
    return caseRows[0] ?? null;
  },

  async findNiceMappingsByCaseId(caseId: string): Promise<NiceMappingRow[]> {
    const [rows] = await pool.execute(
      'SELECT class_no as classNo, description FROM nice_class_mappings WHERE case_id = ?',
      [caseId]
    );
    return rows as NiceMappingRow[];
  },

  async findActiveAssetsByCaseId(caseId: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute('SELECT * FROM mark_assets WHERE case_id = ? AND is_active = 1', [caseId]);
    return rows as RowDataPacket[];
  },

  async findCaseHistoryByCaseId(caseId: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute('SELECT * FROM case_history WHERE case_id = ? ORDER BY created_at DESC', [caseId]);
    return rows as RowDataPacket[];
  },

  async findDeadlinesByCaseId(caseId: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute('SELECT * FROM deadlines WHERE case_id = ? ORDER BY due_date ASC', [caseId]);
    return rows as RowDataPacket[];
  },

  async findCaseById(caseId: string): Promise<CaseRow | null> {
    const [rows] = await pool.execute('SELECT * FROM trademark_cases WHERE id = ?', [caseId]);
    const caseRows = rows as CaseRow[];
    return caseRows[0] ?? null;
  },

  async insertCaseHistory(
    connection: PoolConnection,
    payload: {
      caseId: string;
      userId: string | null;
      action: string;
      oldData: Record<string, unknown>;
      newData: Record<string, unknown>;
    }
  ): Promise<void> {
    await connection.execute(
      'INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [
        crypto.randomUUID(),
        payload.caseId,
        payload.userId,
        payload.action,
        JSON.stringify(payload.oldData),
        JSON.stringify(payload.newData)
      ]
    );
  },

  async updateCaseStatus(
    connection: PoolConnection,
    payload: { caseId: string; status: string; hadFilingDate: boolean; hadRegistrationDate: boolean; publicationDate?: string }
  ): Promise<void> {
    let updateSql = 'UPDATE trademark_cases SET status = ?';
    const params: Array<string | null> = [payload.status];

    if (payload.status === 'FILED' && !payload.hadFilingDate) {
      updateSql += ', filing_date = NOW()';
    }
    if (payload.status === 'REGISTERED' && !payload.hadRegistrationDate) {
      updateSql += ', registration_dt = NOW()';
    }
    if (payload.status === 'PUBLISHED' && payload.publicationDate) {
      updateSql += ', publication_date = ?';
      params.push(payload.publicationDate);
    }

    updateSql += ' WHERE id = ?';
    params.push(payload.caseId);
    await connection.execute(updateSql, params);
  },

  async countNiceClasses(connection: PoolConnection, caseId: string): Promise<number> {
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM nice_class_mappings WHERE case_id = ?', [caseId]);
    const countRows = rows as Array<RowDataPacket & { count: unknown }>;
    const rawCount = countRows[0]?.count;
    if (typeof rawCount === 'number') return rawCount;
    if (typeof rawCount === 'string' && rawCount.trim()) return Number(rawCount);
    return 0;
  },

  async insertInvoice(
    connection: PoolConnection,
    payload: {
      id: string;
      clientId: string;
      invoiceNumber: string;
      currency: string;
      totalAmount: number;
      notes: string;
    }
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'DRAFT')`,
      [payload.id, payload.clientId, payload.invoiceNumber, payload.currency, payload.totalAmount, payload.notes]
    );
  },

  async insertInvoiceItem(
    connection: PoolConnection,
    payload: { invoiceId: string; caseId: string; description: string; category: string; amount: number }
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), payload.invoiceId, payload.caseId, payload.description, payload.category, payload.amount]
    );
  }
};
