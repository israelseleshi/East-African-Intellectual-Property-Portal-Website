import express from 'express';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const upcomingQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional()
});

const deadlineIdParamSchema = z.object({
  id: z.string().min(1)
});

router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const parsed = upcomingQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_DEADLINE_QUERY',
        message: 'Invalid upcoming deadlines query',
        details: parsed.error.flatten()
      });
    }

    const days = parsed.data.days ?? 30;
    const [rows] = await pool.execute(
      `SELECT d.*, tc.mark_name, tc.jurisdiction, c.name as client_name
       FROM deadlines d
       JOIN trademark_cases tc ON d.case_id = tc.id
       LEFT JOIN clients c ON tc.client_id = c.id
       WHERE d.is_completed = FALSE
       AND d.due_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY d.due_date ASC`,
      [days]
    );

    res.json(rows);
  } catch (error) {
    logRouteError(req, 'deadlines.upcoming', error);
    sendApiError(req, res, 500, {
      code: 'DEADLINES_FETCH_FAILED',
      message: 'Failed to fetch deadlines'
    });
  }
});

router.patch('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const parsed = deadlineIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_DEADLINE_ID',
        message: 'Invalid deadline id',
        details: parsed.error.flatten()
      });
    }

    await pool.execute('UPDATE deadlines SET is_completed = TRUE WHERE id = ?', [parsed.data.id]);
    res.json({ id: parsed.data.id, is_completed: true });
  } catch (error) {
    logRouteError(req, 'deadlines.complete', error);
    sendApiError(req, res, 500, {
      code: 'DEADLINE_COMPLETE_FAILED',
      message: 'Failed to complete deadline'
    });
  }
});

export default router;
