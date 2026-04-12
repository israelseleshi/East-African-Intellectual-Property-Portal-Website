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
  client_local_name: string | null;
  client_type: string;
  client_gender: string | null;
  client_nationality: string | null;
  client_residence_country: string | null;
  client_email: string | null;
  client_address_street: string | null;
  client_address_zone: string | null;
  client_wereda: string | null;
  client_house_no: string | null;
  client_city: string | null;
  client_state_name: string | null;
  client_city_code: string | null;
  client_state_code: string | null;
  client_zip_code: string | null;
  client_po_box: string | null;
  client_telephone: string | null;
  client_fax: string | null;
  agent_name: string | null;
  agent_country: string | null;
  agent_city: string | null;
  agent_subcity: string | null;
  agent_woreda: string | null;
  agent_house_no: string | null;
  agent_telephone: string | null;
  agent_email: string | null;
  agent_po_box: string | null;
  agent_fax: string | null;
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
      WHERE tc.deleted_at IS NULL AND c.deleted_at IS NULL
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
        c.local_name as client_local_name,
        c.type as client_type,
        c.gender as client_gender,
        c.nationality as client_nationality,
        c.residence_country as client_residence_country,
        c.email as client_email,
        c.address_street as client_address_street,
        c.address_zone as client_address_zone,
        c.wereda as client_wereda,
        c.house_no as client_house_no,
        c.city as client_city,
        c.state_name as client_state_name,
        c.city_code as client_city_code,
        c.state_code as client_state_code,
        c.zip_code as client_zip_code,
        c.po_box as client_po_box,
        c.telephone as client_telephone,
        c.fax as client_fax,
        a.name as agent_name,
        a.country as agent_country,
        a.city as agent_city,
        a.subcity as agent_subcity,
        a.woreda as agent_woreda,
        a.house_no as agent_house_no,
        a.telephone as agent_telephone,
        a.email as agent_email,
        a.po_box as agent_po_box,
        a.fax as agent_fax
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      LEFT JOIN agents a ON tc.agent_id = a.id
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
  },

  async updateCaseFields(
    connection: PoolConnection,
    caseId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values: Array<string | number | boolean | null> = keys.map((k) => {
      const value = updates[k];
      const normalized = value instanceof Date ? value.toISOString().split('T')[0] : value;
      if (normalized === undefined) return null;
      if (
        typeof normalized === 'string' ||
        typeof normalized === 'number' ||
        typeof normalized === 'boolean' ||
        normalized === null
      ) {
        return normalized;
      }
      return JSON.stringify(normalized);
    });
    values.push(caseId);
    await connection.execute(`UPDATE trademark_cases SET ${setClause} WHERE id = ?`, values);
  },

  async findCaseRegistrationDate(connection: PoolConnection, caseId: string): Promise<Date | null> {
    const [rows] = await connection.execute('SELECT registration_dt FROM trademark_cases WHERE id = ?', [caseId]);
    const data = (rows as Array<RowDataPacket & { registration_dt?: Date | string | null }>)[0];
    if (!data?.registration_dt) return null;
    return new Date(data.registration_dt);
  },

  async supersedePendingDeadlines(connection: PoolConnection, caseId: string): Promise<void> {
    await connection.execute(
      'UPDATE deadlines SET status = "SUPERSEDED" WHERE case_id = ? AND status = "PENDING"',
      [caseId]
    );
  },

  async insertDeadline(
    connection: PoolConnection,
    payload: { caseId: string; dueDate: Date | string; type: string; status?: string }
  ): Promise<void> {
    const dueDate = payload.dueDate instanceof Date
      ? payload.dueDate.toISOString().split('T')[0]
      : payload.dueDate;
    await connection.execute(
      'INSERT INTO deadlines (id, case_id, due_date, type, status) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), payload.caseId, dueDate, payload.type, payload.status || 'PENDING']
    );
  },

  async insertCaseNote(
    connection: PoolConnection,
    payload: { caseId: string; userId: string | null; content: string; noteType?: string; isPrivate?: boolean }
  ): Promise<void> {
    await connection.execute(
      `INSERT INTO case_notes (id, case_id, user_id, note_type, content, is_private)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        payload.caseId,
        payload.userId,
        payload.noteType || 'INTERNAL',
        payload.content,
        payload.isPrivate ?? true
      ]
    );
  },

  async findCaseClientId(connection: PoolConnection, caseId: string): Promise<string | null> {
    const [rows] = await connection.execute('SELECT client_id FROM trademark_cases WHERE id = ?', [caseId]);
    const data = (rows as Array<RowDataPacket & { client_id: string }>)[0];
    return data?.client_id ?? null;
  },

  async findCaseMarkAndClientName(
    connection: PoolConnection,
    caseId: string
  ): Promise<{ mark_name: string | null; client_name: string | null }> {
    const [rows] = await connection.execute(
      `SELECT tc.mark_name, c.name as client_name
       FROM trademark_cases tc
       JOIN clients c ON tc.client_id = c.id
       WHERE tc.id = ?`,
      [caseId]
    );
    const row = (rows as Array<RowDataPacket & { mark_name?: string | null; client_name?: string | null }>)[0];
    return {
      mark_name: row?.mark_name ?? null,
      client_name: row?.client_name ?? null
    };
  },

  async updateClientFields(
    connection: PoolConnection,
    clientId: string,
    updates: Record<string, unknown>
  ): Promise<void> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values: Array<string | number | boolean | null> = keys.map((k) => {
      const value = updates[k];
      if (value === undefined) return null;
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        return value;
      }
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      return JSON.stringify(value);
    });
    values.push(clientId);
    await connection.execute(
      `UPDATE clients SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      values
    );
  },

  async replaceNiceClassMappings(
    connection: PoolConnection,
    caseId: string,
    classNumbers: number[],
    description: string
  ): Promise<void> {
    await connection.execute('DELETE FROM nice_class_mappings WHERE case_id = ?', [caseId]);
    for (const classNo of classNumbers) {
      await connection.execute(
        'INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)',
        [caseId, classNo, description]
      );
    }
  },

  async insertMarkAsset(
    connection: PoolConnection,
    payload: { caseId: string; type: string; filePath: string }
  ): Promise<void> {
    await connection.execute(
      'INSERT INTO mark_assets (id, case_id, type, file_path, created_at) VALUES (?, ?, ?, ?, NOW())',
      [crypto.randomUUID(), payload.caseId, payload.type, payload.filePath]
    );
  }
};
