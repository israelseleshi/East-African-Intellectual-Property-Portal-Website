import crypto from 'crypto';
import { pool } from '../database/db.js';
const normalizeSearchFilters = (filters) => ({
    q: typeof filters.q === 'string' ? filters.q.trim() : '',
    status: typeof filters.status === 'string' ? filters.status.trim() : '',
    jurisdiction: typeof filters.jurisdiction === 'string' ? filters.jurisdiction.trim() : ''
});
export const caseRepository = {
    async findCases(filters) {
        const normalized = normalizeSearchFilters(filters);
        let sql = `
      SELECT tc.*, c.name as client_name, c.type as client_type
      FROM trademark_cases tc
      JOIN clients c ON tc.client_id = c.id
      WHERE 1=1
    `;
        const params = [];
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
        return rows;
    },
    async findDeadlinesByCaseIds(caseIds) {
        if (caseIds.length === 0) {
            return [];
        }
        const placeholders = caseIds.map(() => '?').join(',');
        const [rows] = await pool.execute(`SELECT * FROM deadlines WHERE case_id IN (${placeholders}) ORDER BY due_date ASC`, caseIds);
        return rows;
    },
    async findCaseWithClientById(caseId) {
        const [rows] = await pool.execute(`
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
      `, [caseId]);
        const caseRows = rows;
        return caseRows[0] ?? null;
    },
    async findNiceMappingsByCaseId(caseId) {
        const [rows] = await pool.execute('SELECT class_no as classNo, description FROM nice_class_mappings WHERE case_id = ?', [caseId]);
        return rows;
    },
    async findActiveAssetsByCaseId(caseId) {
        const [rows] = await pool.execute('SELECT * FROM mark_assets WHERE case_id = ? AND is_active = 1', [caseId]);
        return rows;
    },
    async findCaseHistoryByCaseId(caseId) {
        const [rows] = await pool.execute('SELECT * FROM case_history WHERE case_id = ? ORDER BY created_at DESC', [caseId]);
        return rows;
    },
    async findDeadlinesByCaseId(caseId) {
        const [rows] = await pool.execute('SELECT * FROM deadlines WHERE case_id = ? ORDER BY due_date ASC', [caseId]);
        return rows;
    },
    async findCaseById(caseId) {
        const [rows] = await pool.execute('SELECT * FROM trademark_cases WHERE id = ?', [caseId]);
        const caseRows = rows;
        return caseRows[0] ?? null;
    },
    async insertCaseHistory(connection, payload) {
        await connection.execute('INSERT INTO case_history (id, case_id, user_id, action, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)', [
            crypto.randomUUID(),
            payload.caseId,
            payload.userId,
            payload.action,
            JSON.stringify(payload.oldData),
            JSON.stringify(payload.newData)
        ]);
    },
    async updateCaseStatus(connection, payload) {
        let updateSql = 'UPDATE trademark_cases SET status = ?';
        const params = [payload.status];
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
    async countNiceClasses(connection, caseId) {
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM nice_class_mappings WHERE case_id = ?', [caseId]);
        const countRows = rows;
        const rawCount = countRows[0]?.count;
        if (typeof rawCount === 'number')
            return rawCount;
        if (typeof rawCount === 'string' && rawCount.trim())
            return Number(rawCount);
        return 0;
    },
    async insertInvoice(connection, payload) {
        await connection.execute(`INSERT INTO invoices (id, client_id, invoice_number, issue_date, due_date, currency, total_amount, notes, status)
       VALUES (?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), ?, ?, ?, 'DRAFT')`, [payload.id, payload.clientId, payload.invoiceNumber, payload.currency, payload.totalAmount, payload.notes]);
    },
    async insertInvoiceItem(connection, payload) {
        await connection.execute(`INSERT INTO invoice_items (id, invoice_id, case_id, description, category, amount)
       VALUES (?, ?, ?, ?, ?, ?)`, [crypto.randomUUID(), payload.invoiceId, payload.caseId, payload.description, payload.category, payload.amount]);
    },
    async updateCaseFields(connection, caseId, updates) {
        const keys = Object.keys(updates);
        if (keys.length === 0)
            return;
        const setClause = keys.map((k) => `${k} = ?`).join(', ');
        const values = keys.map((k) => {
            const value = updates[k];
            const normalized = value instanceof Date ? value.toISOString().split('T')[0] : value;
            if (normalized === undefined)
                return null;
            if (typeof normalized === 'string' ||
                typeof normalized === 'number' ||
                typeof normalized === 'boolean' ||
                normalized === null) {
                return normalized;
            }
            return JSON.stringify(normalized);
        });
        values.push(caseId);
        await connection.execute(`UPDATE trademark_cases SET ${setClause} WHERE id = ?`, values);
    },
    async findCaseRegistrationDate(connection, caseId) {
        const [rows] = await connection.execute('SELECT registration_dt FROM trademark_cases WHERE id = ?', [caseId]);
        const data = rows[0];
        if (!data?.registration_dt)
            return null;
        return new Date(data.registration_dt);
    },
    async supersedePendingDeadlines(connection, caseId) {
        await connection.execute('UPDATE deadlines SET status = "SUPERSEDED" WHERE case_id = ? AND status = "PENDING"', [caseId]);
    },
    async insertDeadline(connection, payload) {
        const dueDate = payload.dueDate instanceof Date
            ? payload.dueDate.toISOString().split('T')[0]
            : payload.dueDate;
        await connection.execute('INSERT INTO deadlines (id, case_id, due_date, type, status) VALUES (?, ?, ?, ?, ?)', [crypto.randomUUID(), payload.caseId, dueDate, payload.type, payload.status || 'PENDING']);
    },
    async insertCaseNote(connection, payload) {
        await connection.execute(`INSERT INTO case_notes (id, case_id, user_id, note_type, content, is_private)
       VALUES (?, ?, ?, ?, ?, ?)`, [
            crypto.randomUUID(),
            payload.caseId,
            payload.userId,
            payload.noteType || 'INTERNAL',
            payload.content,
            payload.isPrivate ?? true
        ]);
    },
    async findCaseClientId(connection, caseId) {
        const [rows] = await connection.execute('SELECT client_id FROM trademark_cases WHERE id = ?', [caseId]);
        const data = rows[0];
        return data?.client_id ?? null;
    },
    async findCaseMarkAndClientName(connection, caseId) {
        const [rows] = await connection.execute(`SELECT tc.mark_name, c.name as client_name
       FROM trademark_cases tc
       JOIN clients c ON tc.client_id = c.id
       WHERE tc.id = ?`, [caseId]);
        const row = rows[0];
        return {
            mark_name: row?.mark_name ?? null,
            client_name: row?.client_name ?? null
        };
    },
    async updateClientFields(connection, clientId, updates) {
        const keys = Object.keys(updates);
        if (keys.length === 0)
            return;
        const setClause = keys.map((k) => `${k} = ?`).join(', ');
        const values = keys.map((k) => {
            const value = updates[k];
            if (value === undefined)
                return null;
            if (typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean' ||
                value === null) {
                return value;
            }
            if (value instanceof Date) {
                return value.toISOString().split('T')[0];
            }
            return JSON.stringify(value);
        });
        values.push(clientId);
        await connection.execute(`UPDATE clients SET ${setClause}, updated_at = NOW() WHERE id = ?`, values);
    },
    async replaceNiceClassMappings(connection, caseId, classNumbers, description) {
        await connection.execute('DELETE FROM nice_class_mappings WHERE case_id = ?', [caseId]);
        for (const classNo of classNumbers) {
            await connection.execute('INSERT INTO nice_class_mappings (case_id, class_no, description) VALUES (?, ?, ?)', [caseId, classNo, description]);
        }
    },
    async insertMarkAsset(connection, payload) {
        await connection.execute('INSERT INTO mark_assets (id, case_id, type, file_path, created_at) VALUES (?, ?, ?, ?, NOW())', [crypto.randomUUID(), payload.caseId, payload.type, payload.filePath]);
    }
};
