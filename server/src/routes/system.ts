import express from 'express';
import { pool, timedExecute, getQueryMetrics } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
import { readFileSync } from 'fs';
import path from 'path';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const [dbResult] = await pool.execute('SELECT NOW() as now');
    const rows = dbResult as Array<{ now: string }>;
    res.json({ status: 'OK', database: 'CONNECTED', time: rows[0].now, env: process.env.NODE_ENV });
  } catch (error) {
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
    const totalCasesRows = await timedExecute('system.totalCases', 'SELECT COUNT(*) as count FROM trademark_cases');
    const activeCasesRows = await timedExecute('system.activeCases', "SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT'");
    const pendingDeadlinesRows = await timedExecute('system.pendingDeadlines', 'SELECT COUNT(*) as count FROM deadlines WHERE is_completed = false');
    const renewalWindowRows = await timedExecute('system.renewalWindow', `
      SELECT COUNT(*) as count FROM deadlines
      WHERE type = 'RENEWAL'
      AND is_completed = false
      AND due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);
    const recentActivityRows = await timedExecute('system.recentActivity', `
      SELECT ch.id, ch.case_id as caseId, ch.user_id, ch.action, ch.old_data, ch.new_data, ch.created_at as createdAt, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      ORDER BY ch.created_at DESC
      LIMIT 5
    `);
    const upcomingDeadlinesRows = await timedExecute('system.upcomingDeadlines', `
      SELECT d.id, d.case_id, d.type, d.status, d.due_date, d.is_completed, d.created_at,
             tc.mark_name, tc.jurisdiction, c.name as client_name
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
        totalCases: (totalCasesRows as Array<{ count: number }>)[0].count,
        activeTrademarks: (activeCasesRows as Array<{ count: number }>)[0].count,
        pendingDeadlines: (pendingDeadlinesRows as Array<{ count: number }>)[0].count,
        renewalWindow: (renewalWindowRows as Array<{ count: number }>)[0].count
      },
      recentActivity: recentActivityRows,
      upcomingDeadlines: upcomingDeadlinesRows
    });
  } catch (error) {
    logRouteError(req, 'system.dashboardUnified', error);
    sendApiError(req, res, 500, {
      code: 'DASHBOARD_FETCH_FAILED',
      message: 'Failed to fetch dashboard data',
      details: process.env.NODE_ENV === 'production'
        ? undefined
        : (error instanceof Error ? error.message : String(error))
    });
  }
});

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalCasesRows = await timedExecute('system.totalCases', 'SELECT COUNT(*) as count FROM trademark_cases');
    const activeCasesRows = await timedExecute('system.activeCases', "SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT'");
    const pendingDeadlinesRows = await timedExecute('system.pendingDeadlines', 'SELECT COUNT(*) as count FROM deadlines WHERE is_completed = false');
    const renewalWindowRows = await timedExecute('system.renewalWindow', `
      SELECT COUNT(*) as count FROM deadlines
      WHERE type = 'RENEWAL'
      AND is_completed = false
      AND due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);

    const recentActivityRows = await timedExecute('system.recentActivity', `
      SELECT ch.id, ch.case_id, ch.user_id, ch.action, ch.old_data, ch.new_data, ch.created_at, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      ORDER BY ch.created_at DESC
      LIMIT 5
    `);

    res.json({
      totalCases: (totalCasesRows as Array<{ count: number }>)[0].count,
      activeTrademarks: (activeCasesRows as Array<{ count: number }>)[0].count,
      pendingDeadlines: (pendingDeadlinesRows as Array<{ count: number }>)[0].count,
      renewalWindow: (renewalWindowRows as Array<{ count: number }>)[0].count,
      recentActivity: recentActivityRows
    });
  } catch (error) {
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

router.get('/version', (_req, res) => {
  const sha = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
  const buildTimePath = path.resolve(process.cwd(), 'server', 'dist', 'build.time');
  let buildTime = process.env.BUILD_TIME || null;
  try {
    buildTime = readFileSync(buildTimePath, 'utf8');
  } catch (err) {
    // ignore
  }
  res.json({
    gitSha: sha,
    buildTime
  });
});

router.get('/metrics', authenticateToken, (_req, res) => {
  res.json({ queries: getQueryMetrics() });
});

export default router;
