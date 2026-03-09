import crypto from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../database/db.js';

export interface FeeScheduleFilters {
  jurisdiction?: string;
  stage?: string;
  category?: string;
  active?: boolean;
}

export interface CreateFeeScheduleInput {
  jurisdiction: string;
  stage: string;
  category: string;
  amount: number;
  currency: string;
  effectiveDate: string | Date;
  expiryDate?: string | null;
  description?: string | null;
  createdBy: string | null;
}

export interface FeeScheduleUpdateInput {
  amount?: number;
  currency?: string;
  description?: string;
  is_active?: boolean;
  expiry_date?: string | null;
}

export interface CaseFeeContextRow extends RowDataPacket {
  jurisdiction: string;
  status: string;
  flow_stage: string;
}

export const feeRepository = {
  async listFeeSchedules(filters: FeeScheduleFilters): Promise<RowDataPacket[]> {
    let sql = `
      SELECT fs.*, j.name as jurisdiction_name, u.name as created_by_name
      FROM fee_schedules fs
      LEFT JOIN jurisdictions j ON fs.jurisdiction = j.code
      LEFT JOIN users u ON fs.created_by = u.id
      WHERE fs.deleted_at IS NULL
    `;
    const params: Array<string | number | boolean> = [];

    if (filters.jurisdiction) {
      sql += ' AND fs.jurisdiction = ?';
      params.push(filters.jurisdiction);
    }

    if (filters.stage) {
      sql += ' AND fs.stage = ?';
      params.push(filters.stage);
    }

    if (filters.category) {
      sql += ' AND fs.category = ?';
      params.push(filters.category);
    }

    if (filters.active) {
      sql += ' AND fs.is_active = TRUE AND (fs.expiry_date IS NULL OR fs.expiry_date >= CURDATE())';
    }

    sql += ' ORDER BY fs.jurisdiction, fs.stage, fs.category, fs.effective_date DESC';
    const [rows] = await pool.execute(sql, params);
    return rows as RowDataPacket[];
  },

  async getFeesByJurisdictionStage(jurisdiction: string, stage: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(
      `SELECT * FROM fee_schedules
       WHERE jurisdiction = ? AND stage = ? AND is_active = TRUE
       AND deleted_at IS NULL
       AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       ORDER BY category`,
      [jurisdiction, stage]
    );
    return rows as RowDataPacket[];
  },

  async getCaseFeeContext(caseId: string): Promise<CaseFeeContextRow | null> {
    const [rows] = await pool.execute(
      'SELECT jurisdiction, status, flow_stage FROM trademark_cases WHERE id = ? AND deleted_at IS NULL',
      [caseId]
    );

    const results = rows as CaseFeeContextRow[];
    return results[0] ?? null;
  },

  async createFeeSchedule(input: CreateFeeScheduleInput): Promise<string> {
    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO fee_schedules (id, jurisdiction, stage, category, amount, currency,
       effective_date, expiry_date, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.jurisdiction,
        input.stage,
        input.category,
        input.amount,
        input.currency,
        input.effectiveDate,
        input.expiryDate ?? null,
        input.description ?? null,
        input.createdBy
      ]
    );
    return id;
  },

  async updateFeeSchedule(id: string, updates: FeeScheduleUpdateInput): Promise<boolean> {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    const keys = entries.map(([key]) => key);
    if (keys.length === 0) {
      return false;
    }

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const values = entries.map(([, value]) => value);
    values.push(id);

    const [result] = await pool.execute(
      `UPDATE fee_schedules SET ${setClause}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    return (result as ResultSetHeader).affectedRows > 0;
  },

  async deleteFeeSchedule(id: string, permanent: boolean): Promise<boolean> {
    let result: ResultSetHeader;

    if (permanent) {
      const [deleteResult] = await pool.execute('DELETE FROM fee_schedules WHERE id = ?', [id]);
      result = deleteResult as ResultSetHeader;
    } else {
      const [softDeleteResult] = await pool.execute(
        'UPDATE fee_schedules SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      result = softDeleteResult as ResultSetHeader;
    }

    return result.affectedRows > 0;
  },

  async compareFees(stage: string, category: string): Promise<RowDataPacket[]> {
    const [rows] = await pool.execute(
      `SELECT fs.jurisdiction, j.name as jurisdiction_name, fs.amount, fs.currency
       FROM fee_schedules fs
       JOIN jurisdictions j ON fs.jurisdiction = j.code
       WHERE fs.stage = ? AND fs.category = ? AND fs.is_active = TRUE
       AND fs.deleted_at IS NULL
       AND (fs.expiry_date IS NULL OR fs.expiry_date >= CURDATE())
       ORDER BY fs.amount ASC`,
      [stage, category]
    );

    return rows as RowDataPacket[];
  }
};
