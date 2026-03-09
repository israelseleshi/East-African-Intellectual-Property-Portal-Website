import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const oppositionIdParamSchema = z.object({ id: z.string().min(1) });
const caseIdParamSchema = z.object({ caseId: z.string().min(1) });

const listQuerySchema = z.object({
  status: z.string().optional(),
  caseId: z.string().optional(),
  pending: z.enum(['true', 'false']).optional()
});

const createOppositionSchema = z.object({
  caseId: z.string().min(1),
  opponentName: z.string().min(1),
  opponentAddress: z.string().optional(),
  opponentRepresentative: z.string().optional(),
  grounds: z.string().min(1),
  oppositionDate: z.string().optional(),
  deadlineDate: z.string().optional(),
  notes: z.string().optional()
});

const updateOppositionSchema = z.object({
  opponent_name: z.string().optional(),
  opponent_address: z.string().optional(),
  opponent_representative: z.string().optional(),
  grounds: z.string().optional(),
  opposition_date: z.string().optional(),
  deadline_date: z.string().optional(),
  status: z.string().optional(),
  response_filed_date: z.string().optional(),
  response_document_path: z.string().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields to update'
});

const updateOppositionStatusSchema = z.object({
  status: z.enum(['PENDING', 'RESPONDED', 'WITHDRAWN', 'RESOLVED']),
  responseFiledDate: z.string().optional(),
  outcome: z.string().optional()
});

const deleteQuerySchema = z.object({
  permanent: z.enum(['true', 'false']).optional()
});

const pendingQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional()
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITIONS_QUERY',
        message: 'Invalid oppositions query',
        details: parsed.error.flatten()
      });
    }

    let sql = `
      SELECT o.*, tc.mark_name, c.name as client_name, tc.jurisdiction
      FROM oppositions o
      JOIN trademark_cases tc ON o.case_id = tc.id
      JOIN clients c ON tc.client_id = c.id
      WHERE o.deleted_at IS NULL
    `;
    const params: string[] = [];

    if (parsed.data.status) {
      sql += ' AND o.status = ?';
      params.push(parsed.data.status);
    }

    if (parsed.data.caseId) {
      sql += ' AND o.case_id = ?';
      params.push(parsed.data.caseId);
    }

    if (parsed.data.pending === 'true') {
      sql += ' AND o.status = "PENDING" AND o.deadline_date >= CURDATE()';
    }

    sql += ' ORDER BY o.deadline_date ASC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (error) {
    logRouteError(req, 'oppositions.list', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITIONS_FETCH_FAILED',
      message: 'Failed to fetch oppositions'
    });
  }
});

router.get('/case/:caseId', authenticateToken, async (req, res) => {
  try {
    const parsed = caseIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CASE_ID',
        message: 'Invalid case id',
        details: parsed.error.flatten()
      });
    }

    const [rows] = await pool.execute(
      `SELECT o.*, tc.mark_name
       FROM oppositions o
       JOIN trademark_cases tc ON o.case_id = tc.id
       WHERE o.case_id = ? AND o.deleted_at IS NULL
       ORDER BY o.created_at DESC`,
      [parsed.data.caseId]
    );

    res.json(rows);
  } catch (error) {
    logRouteError(req, 'oppositions.listByCase', error);
    sendApiError(req, res, 500, {
      code: 'CASE_OPPOSITIONS_FETCH_FAILED',
      message: 'Failed to fetch oppositions'
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const parsed = oppositionIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_ID',
        message: 'Invalid opposition id',
        details: parsed.error.flatten()
      });
    }

    const [rows] = await pool.execute(
      `SELECT o.*, tc.mark_name, c.name as client_name, tc.jurisdiction
       FROM oppositions o
       JOIN trademark_cases tc ON o.case_id = tc.id
       JOIN clients c ON tc.client_id = c.id
       WHERE o.id = ? AND o.deleted_at IS NULL`,
      [parsed.data.id]
    );

    if ((rows as unknown[]).length === 0) {
      return sendApiError(req, res, 404, {
        code: 'OPPOSITION_NOT_FOUND',
        message: 'Opposition not found'
      });
    }

    res.json((rows as unknown[])[0]);
  } catch (error) {
    logRouteError(req, 'oppositions.getById', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITION_FETCH_FAILED',
      message: 'Failed to fetch opposition'
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const parsed = createOppositionSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_PAYLOAD',
        message: 'Invalid opposition payload',
        details: parsed.error.flatten()
      });
    }

    let calculatedDeadline = parsed.data.deadlineDate;
    if (!calculatedDeadline && parsed.data.oppositionDate) {
      const [jurisdictionRows] = await pool.execute(
        `SELECT j.opposition_period_days
         FROM trademark_cases tc
         JOIN jurisdictions j ON tc.jurisdiction = j.code
         WHERE tc.id = ?`,
        [parsed.data.caseId]
      );

      if ((jurisdictionRows as unknown[]).length > 0) {
        const days = ((jurisdictionRows as Array<{ opposition_period_days: number }>)[0]).opposition_period_days || 60;
        const oppDate = new Date(parsed.data.oppositionDate);
        oppDate.setDate(oppDate.getDate() + days);
        calculatedDeadline = oppDate.toISOString().split('T')[0];
      }
    }

    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO oppositions (id, case_id, opponent_name, opponent_address,
       opponent_representative, grounds, opposition_date, deadline_date, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.data.caseId,
        parsed.data.opponentName,
        parsed.data.opponentAddress || null,
        parsed.data.opponentRepresentative || null,
        parsed.data.grounds,
        parsed.data.oppositionDate || new Date(),
        calculatedDeadline || null,
        parsed.data.notes || null,
        req.user?.id ?? null
      ]
    );

    if (calculatedDeadline) {
      await pool.execute(
        `INSERT INTO deadlines (id, case_id, due_date, type, description)
         VALUES (?, ?, ?, 'OPPOSITION_RESPONSE', ?)`,
        [crypto.randomUUID(), parsed.data.caseId, calculatedDeadline, `Response deadline for opposition by ${parsed.data.opponentName}`]
      );
    }

    res.status(201).json({
      id,
      caseId: parsed.data.caseId,
      opponentName: parsed.data.opponentName,
      grounds: parsed.data.grounds,
      oppositionDate: parsed.data.oppositionDate,
      deadlineDate: calculatedDeadline,
      status: 'PENDING'
    });
  } catch (error) {
    logRouteError(req, 'oppositions.create', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITION_CREATE_FAILED',
      message: 'Failed to create opposition'
    });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = oppositionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_ID',
        message: 'Invalid opposition id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateOppositionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_UPDATE_PAYLOAD',
        message: 'Invalid opposition update payload',
        details: parsedBody.error.flatten()
      });
    }

    const fields = Object.keys(parsedBody.data).map((k) => `${k} = ?`).join(', ');
    const values = Object.values(parsedBody.data);
    values.push(parsedParams.data.id);

    await pool.execute(
      `UPDATE oppositions SET ${fields}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    logRouteError(req, 'oppositions.update', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITION_UPDATE_FAILED',
      message: 'Failed to update opposition'
    });
  }
});

router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const parsedParams = oppositionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_ID',
        message: 'Invalid opposition id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateOppositionStatusSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_STATUS_PAYLOAD',
        message: 'Invalid opposition status payload',
        details: parsedBody.error.flatten()
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const updates: Record<string, string | Date> = {
        status: parsedBody.data.status,
        updated_at: new Date()
      };
      if (parsedBody.data.status === 'RESPONDED' && parsedBody.data.responseFiledDate) {
        updates.response_filed_date = parsedBody.data.responseFiledDate;
      }
      if (parsedBody.data.outcome) {
        updates.outcome = parsedBody.data.outcome;
      }

      const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(parsedParams.data.id);
      await connection.execute(`UPDATE oppositions SET ${fields} WHERE id = ? AND deleted_at IS NULL`, values);

      if (parsedBody.data.status === 'RESOLVED') {
        const [oppRows] = await connection.execute('SELECT case_id FROM oppositions WHERE id = ?', [parsedParams.data.id]);
        const caseId = (oppRows as Array<{ case_id?: string }>)[0]?.case_id;

        if (caseId) {
          const finalStatus = parsedBody.data.outcome === 'LOST' ? 'ABANDONED' : 'PUBLISHED';
          const finalStage = parsedBody.data.outcome === 'LOST' ? 'DEAD_WITHDRAWN' : 'CERTIFICATE_REQUEST';
          await connection.execute('UPDATE trademark_cases SET status = ?, flow_stage = ? WHERE id = ?', [finalStatus, finalStage, caseId]);
        }
      }

      await connection.commit();
      res.json({ success: true, status: parsedBody.data.status });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logRouteError(req, 'oppositions.updateStatus', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITION_STATUS_UPDATE_FAILED',
      message: 'Failed to update opposition status'
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = oppositionIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_ID',
        message: 'Invalid opposition id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedQuery = deleteQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_DELETE_QUERY',
        message: 'Invalid opposition delete query',
        details: parsedQuery.error.flatten()
      });
    }

    const permanent = parsedQuery.data.permanent === 'true';
    if (permanent) {
      await pool.execute('DELETE FROM oppositions WHERE id = ?', [parsedParams.data.id]);
    } else {
      await pool.execute('UPDATE oppositions SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [parsedParams.data.id]);
    }

    res.json({ success: true, message: permanent ? 'Opposition permanently deleted' : 'Opposition moved to trash' });
  } catch (error) {
    logRouteError(req, 'oppositions.delete', error);
    sendApiError(req, res, 500, {
      code: 'OPPOSITION_DELETE_FAILED',
      message: 'Failed to delete opposition'
    });
  }
});

router.get('/dashboard/pending', authenticateToken, async (req, res) => {
  try {
    const parsed = pendingQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OPPOSITION_PENDING_QUERY',
        message: 'Invalid pending oppositions query',
        details: parsed.error.flatten()
      });
    }

    const days = parsed.data.days ?? 30;
    const [rows] = await pool.execute(
      `SELECT o.*, tc.mark_name, c.name as client_name,
              DATEDIFF(o.deadline_date, CURDATE()) as days_remaining
       FROM oppositions o
       JOIN trademark_cases tc ON o.case_id = tc.id
       JOIN clients c ON tc.client_id = c.id
       WHERE o.status = 'PENDING'
       AND o.deleted_at IS NULL
       AND o.deadline_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
       ORDER BY o.deadline_date ASC`,
      [days]
    );

    res.json(rows);
  } catch (error) {
    logRouteError(req, 'oppositions.pending', error);
    sendApiError(req, res, 500, {
      code: 'PENDING_OPPOSITIONS_FETCH_FAILED',
      message: 'Failed to fetch pending oppositions'
    });
  }
});

export default router;
