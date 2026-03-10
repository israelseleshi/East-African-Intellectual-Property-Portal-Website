import express from 'express';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
const router = express.Router();
router.get('/health', async (req, res) => {
    try {
        const [dbResult] = await pool.execute('SELECT NOW() as now');
        const rows = dbResult;
        res.json({ status: 'OK', database: 'CONNECTED', time: rows[0].now, env: process.env.NODE_ENV });
    }
    catch (error) {
        logRouteError(req, 'system.health', error);
        sendApiError(req, res, 500, {
            code: 'HEALTH_CHECK_FAILED',
            message: 'Database disconnected',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
router.get('/dashboard-unified', authenticateToken, async (req, res) => {
    try {
        const [totalCasesRows] = await pool.execute('SELECT COUNT(*) as count FROM trademark_cases');
        const [activeCasesRows] = await pool.execute("SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT'");
        const [pendingDeadlinesRows] = await pool.execute('SELECT COUNT(*) as count FROM deadlines WHERE is_completed = false');
        const [renewalWindowRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM deadlines
      WHERE type = 'RENEWAL'
      AND is_completed = false
      AND due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);
        const [recentActivityRows] = await pool.execute(`
      SELECT ch.id, ch.case_id as caseId, ch.user_id, ch.action, ch.old_data, ch.new_data, ch.created_at as createdAt, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      ORDER BY ch.created_at DESC
      LIMIT 5
    `);
        const [upcomingDeadlinesRows] = await pool.execute(`
      SELECT d.*, tc.mark_name, tc.jurisdiction, c.name as client_name
      FROM deadlines d
      JOIN trademark_cases tc ON d.case_id = tc.id
      LEFT JOIN clients c ON tc.client_id = c.id
      WHERE d.is_completed = FALSE
      AND d.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY d.due_date ASC
      LIMIT 5
    `);
        res.json({
            stats: {
                totalCases: totalCasesRows[0].count,
                activeTrademarks: activeCasesRows[0].count,
                pendingDeadlines: pendingDeadlinesRows[0].count,
                renewalWindow: renewalWindowRows[0].count
            },
            recentActivity: recentActivityRows,
            upcomingDeadlines: upcomingDeadlinesRows
        });
    }
    catch (error) {
        logRouteError(req, 'system.dashboardUnified', error);
        sendApiError(req, res, 500, {
            code: 'DASHBOARD_FETCH_FAILED',
            message: 'Failed to fetch dashboard data'
        });
    }
});
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const [totalCasesRows] = await pool.execute('SELECT COUNT(*) as count FROM trademark_cases');
        const [activeCasesRows] = await pool.execute("SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT'");
        const [pendingDeadlinesRows] = await pool.execute('SELECT COUNT(*) as count FROM deadlines WHERE is_completed = false');
        const [renewalWindowRows] = await pool.execute(`
      SELECT COUNT(*) as count FROM deadlines
      WHERE type = 'RENEWAL'
      AND is_completed = false
      AND due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);
        const [recentActivityRows] = await pool.execute(`
      SELECT ch.*, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      ORDER BY ch.created_at DESC
      LIMIT 5
    `);
        res.json({
            totalCases: totalCasesRows[0].count,
            activeTrademarks: activeCasesRows[0].count,
            pendingDeadlines: pendingDeadlinesRows[0].count,
            renewalWindow: renewalWindowRows[0].count,
            recentActivity: recentActivityRows
        });
    }
    catch (error) {
        logRouteError(req, 'system.stats', error);
        sendApiError(req, res, 500, {
            code: 'STATS_FETCH_FAILED',
            message: 'Failed to fetch stats'
        });
    }
});
router.post('/init', async (_req, res) => {
    res.json({ message: 'System initialization endpoint available' });
});
export default router;
