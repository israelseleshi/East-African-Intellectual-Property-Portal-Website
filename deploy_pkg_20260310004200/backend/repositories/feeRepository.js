import crypto from 'crypto';
import { pool } from '../database/db.js';
export const feeRepository = {
    async listFeeSchedules(filters) {
        let sql = `
      SELECT fs.*, j.name as jurisdiction_name, u.name as created_by_name
      FROM fee_schedules fs
      LEFT JOIN jurisdictions j ON fs.jurisdiction = j.code
      LEFT JOIN users u ON fs.created_by = u.id
      WHERE fs.deleted_at IS NULL
    `;
        const params = [];
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
        return rows;
    },
    async getFeesByJurisdictionStage(jurisdiction, stage) {
        const [rows] = await pool.execute(`SELECT * FROM fee_schedules
       WHERE jurisdiction = ? AND stage = ? AND is_active = TRUE
       AND deleted_at IS NULL
       AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       ORDER BY category`, [jurisdiction, stage]);
        return rows;
    },
    async getCaseFeeContext(caseId) {
        const [rows] = await pool.execute('SELECT jurisdiction, status, flow_stage FROM trademark_cases WHERE id = ? AND deleted_at IS NULL', [caseId]);
        const results = rows;
        return results[0] ?? null;
    },
    async createFeeSchedule(input) {
        const id = crypto.randomUUID();
        await pool.execute(`INSERT INTO fee_schedules (id, jurisdiction, stage, category, amount, currency,
       effective_date, expiry_date, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
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
        ]);
        return id;
    },
    async updateFeeSchedule(id, updates) {
        const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
        const keys = entries.map(([key]) => key);
        if (keys.length === 0) {
            return false;
        }
        const setClause = keys.map((key) => `${key} = ?`).join(', ');
        const values = entries.map(([, value]) => value);
        values.push(id);
        const [result] = await pool.execute(`UPDATE fee_schedules SET ${setClause}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`, values);
        return result.affectedRows > 0;
    },
    async deleteFeeSchedule(id, permanent) {
        let result;
        if (permanent) {
            const [deleteResult] = await pool.execute('DELETE FROM fee_schedules WHERE id = ?', [id]);
            result = deleteResult;
        }
        else {
            const [softDeleteResult] = await pool.execute('UPDATE fee_schedules SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [id]);
            result = softDeleteResult;
        }
        return result.affectedRows > 0;
    },
    async compareFees(stage, category) {
        const [rows] = await pool.execute(`SELECT fs.jurisdiction, j.name as jurisdiction_name, fs.amount, fs.currency
       FROM fee_schedules fs
       JOIN jurisdictions j ON fs.jurisdiction = j.code
       WHERE fs.stage = ? AND fs.category = ? AND fs.is_active = TRUE
       AND fs.deleted_at IS NULL
       AND (fs.expiry_date IS NULL OR fs.expiry_date >= CURDATE())
       ORDER BY fs.amount ASC`, [stage, category]);
        return rows;
    }
};
