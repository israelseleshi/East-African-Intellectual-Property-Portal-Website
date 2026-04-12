import express from 'express';
import { pool, timedExecute, getQueryMetrics } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
import { readFileSync } from 'fs';
import path from 'path';
import { ResultSetHeader } from 'mysql2';

const router = express.Router();

// ... existing routes ...

router.get('/trash', authenticateToken, async (req, res) => {
  try {
    const [cases] = await pool.execute(`
      SELECT 'trademark_cases' as type, id, mark_name as name, deleted_at, status
      FROM trademark_cases 
      WHERE deleted_at IS NULL = false
      ORDER BY deleted_at DESC
    `);
    
    const [clients] = await pool.execute(`
      SELECT 'clients' as type, id, name, deleted_at, status
      FROM clients 
      WHERE deleted_at IS NULL = false
      ORDER BY deleted_at DESC
    `);

    const [invoices] = await pool.execute(`
      SELECT 'invoices' as type, id, invoice_number as name, deleted_at, status
      FROM invoices 
      WHERE deleted_at IS NULL = false
      ORDER BY deleted_at DESC
    `);

    res.json({
      items: [
        ...(cases as any[]),
        ...(clients as any[]),
        ...(invoices as any[])
      ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())
    });
  } catch (error) {
    logRouteError(req, 'system.trash', error);
    sendApiError(req, res, 500, {
      code: 'TRASH_FETCH_FAILED',
      message: 'Failed to fetch trash items'
    });
  }
});

router.post('/trash/restore/:type/:id', authenticateToken, async (req, res) => {
  const { type, id } = req.params;
  const validTypes = ['trademark_cases', 'clients', 'deadlines', 'invoices', 'users'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid resource type' });
  }

  try {
    const [result] = await pool.execute(
      `UPDATE ${type} SET deleted_at = NULL WHERE id = ?`,
      [id]
    ) as [ResultSetHeader, unknown[]];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in trash' });
    }

    res.json({ success: true, message: 'Item restored successfully' });
  } catch (error) {
    logRouteError(req, 'system.restore', error);
    sendApiError(req, res, 500, {
      code: 'RESTORE_FAILED',
      message: 'Failed to restore item'
    });
  }
});

router.delete('/trash/purge/:type/:id', authenticateToken, async (req, res) => {
  const { type, id } = req.params;
  const validTypes = ['trademark_cases', 'clients', 'deadlines', 'invoices', 'users'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid resource type' });
  }

  try {
    const [result] = await pool.execute(
      `DELETE FROM ${type} WHERE id = ? AND deleted_at IS NOT NULL`,
      [id]
    ) as [ResultSetHeader, unknown[]];

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found in trash or already purged' });
    }

    res.json({ success: true, message: 'Item permanently deleted' });
  } catch (error) {
    logRouteError(req, 'system.purge', error);
    sendApiError(req, res, 500, {
      code: 'PURGE_FAILED',
      message: 'Failed to permanently delete item'
    });
  }
});

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
    const totalCasesRows = await timedExecute('system.totalCases', 'SELECT COUNT(*) as count FROM trademark_cases WHERE deleted_at IS NULL');
    const activeCasesRows = await timedExecute('system.activeCases', "SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT' AND deleted_at IS NULL");
    const pendingDeadlinesRows = await timedExecute('system.pendingDeadlines', 'SELECT COUNT(*) as count FROM deadlines d JOIN trademark_cases tc ON d.case_id = tc.id WHERE d.is_completed = false AND tc.deleted_at IS NULL');
    const renewalWindowRows = await timedExecute('system.renewalWindow', `
      SELECT COUNT(*) as count FROM deadlines d
      JOIN trademark_cases tc ON d.case_id = tc.id
      WHERE d.type = 'RENEWAL'
      AND d.is_completed = false
      AND tc.deleted_at IS NULL
      AND d.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);
    const recentActivityRows = await timedExecute('system.recentActivity', `
      SELECT ch.id, ch.case_id as caseId, ch.user_id, ch.action, ch.old_data, ch.new_data, ch.created_at as createdAt, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      WHERE tc.deleted_at IS NULL
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
      AND tc.deleted_at IS NULL
      AND d.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
      ORDER BY d.due_date ASC
      LIMIT 5
    `);

    // Fetch financial stats (exclude deleted invoices)
    const [financialStats] = await pool.execute(`
      SELECT 
        SUM(total_amount) as totalInvoiced,
        SUM(CASE WHEN status = 'UNPAID' OR status = 'OVERDUE' THEN total_amount ELSE 0 END) as totalOutstanding,
        SUM(CASE WHEN status = 'OVERDUE' THEN total_amount ELSE 0 END) as totalOverdue,
        CASE 
          WHEN SUM(total_amount) > 0 
          THEN (SUM(CASE WHEN status = 'PAID' THEN total_amount ELSE 0 END) / SUM(total_amount)) * 100 
          ELSE 0 
        END as collectionRate
      FROM invoices
      WHERE deleted_at IS NULL
    `);
    const fin = (financialStats as any[])[0];

    // Fetch currency breakdown for financial stats
    const [currencyStats] = await pool.execute(`
      SELECT 
        currency,
        SUM(total_amount) as totalInvoiced,
        SUM(CASE WHEN status = 'UNPAID' OR status = 'OVERDUE' THEN total_amount ELSE 0 END) as totalOutstanding,
        SUM(CASE WHEN status = 'OVERDUE' THEN total_amount ELSE 0 END) as totalOverdue
      FROM invoices
      WHERE deleted_at IS NULL
      GROUP BY currency
      ORDER BY currency
    `);

    res.json({
      stats: {
        totalCases: (totalCasesRows as Array<{ count: number }>)[0].count,
        activeTrademarks: (activeCasesRows as Array<{ count: number }>)[0].count,
        pendingDeadlines: (pendingDeadlinesRows as Array<{ count: number }>)[0].count,
        renewalWindow: (renewalWindowRows as Array<{ count: number }>)[0].count,
        totalInvoiced: fin.totalInvoiced || 0,
        totalOutstanding: fin.totalOutstanding || 0,
        totalOverdue: fin.totalOverdue || 0,
        collectionRate: Math.round(fin.collectionRate || 0)
      },
      currencyBreakdown: currencyStats,
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
    const totalCasesRows = await timedExecute('system.totalCases', 'SELECT COUNT(*) as count FROM trademark_cases WHERE deleted_at IS NULL');
    const activeCasesRows = await timedExecute('system.activeCases', "SELECT COUNT(*) as count FROM trademark_cases WHERE status != 'DRAFT' AND deleted_at IS NULL");
    const pendingDeadlinesRows = await timedExecute('system.pendingDeadlines', 'SELECT COUNT(*) as count FROM deadlines d JOIN trademark_cases tc ON d.case_id = tc.id WHERE d.is_completed = false AND tc.deleted_at IS NULL');
    const renewalWindowRows = await timedExecute('system.renewalWindow', `
      SELECT COUNT(*) as count FROM deadlines d
      JOIN trademark_cases tc ON d.case_id = tc.id
      WHERE d.type = 'RENEWAL'
      AND d.is_completed = false
      AND tc.deleted_at IS NULL
      AND d.due_date <= DATE_ADD(NOW(), INTERVAL 30 DAY)
    `);

    const recentActivityRows = await timedExecute('system.recentActivity', `
      SELECT ch.id, ch.case_id, ch.user_id, ch.action, ch.old_data, ch.new_data, ch.created_at, tc.mark_name
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      WHERE tc.deleted_at IS NULL
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

router.get('/activity-stats', authenticateToken, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    
    const [activity] = await pool.execute(`
      SELECT 
        DATE(ch.created_at) as date,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT ch.action SEPARATOR ',') as actions
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      WHERE YEAR(ch.created_at) = ?
      AND tc.deleted_at IS NULL
      GROUP BY DATE(ch.created_at)
      ORDER BY date ASC
    `, [currentYear]);

    const [caseCreations] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM trademark_cases
      WHERE YEAR(created_at) = ? AND deleted_at IS NULL
      GROUP BY DATE(created_at)
    `, [currentYear]);

    const [clientCreations] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM clients
      WHERE YEAR(created_at) = ? AND deleted_at IS NULL
      GROUP BY DATE(created_at)
    `, [currentYear]);

    const [invoiceCreations] = await pool.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM invoices
      WHERE YEAR(created_at) = ? AND deleted_at IS NULL
      GROUP BY DATE(created_at)
    `, [currentYear]);

    const activityByDate = new Map((activity as Array<{ date: string; count: number; actions: string }>).map(r => [r.date, { count: r.count, actions: r.actions }]));
    const casesByDate = new Map((caseCreations as Array<{ date: string; count: number }>).map(r => [r.date, r.count]));
    const clientsByDate = new Map((clientCreations as Array<{ date: string; count: number }>).map(r => [r.date, r.count]));
    const invoicesByDate = new Map((invoiceCreations as Array<{ date: string; count: number }>).map(r => [r.date, r.count]));

    const allDates = new Set([
      ...activityByDate.keys(),
      ...casesByDate.keys(),
      ...clientsByDate.keys(),
      ...invoicesByDate.keys()
    ]);

    const result = Array.from(allDates).sort().map(date => ({
      date,
      count: (activityByDate.get(date)?.count || 0) + (casesByDate.get(date) || 0) + (clientsByDate.get(date) || 0) + (invoicesByDate.get(date) || 0),
      actions: activityByDate.get(date)?.actions || '',
      cases: casesByDate.get(date) || 0,
      clients: clientsByDate.get(date) || 0,
      invoices: invoicesByDate.get(date) || 0
    }));

    res.json(result);
  } catch (error) {
    logRouteError(req, 'system.activityStats', error);
    sendApiError(req, res, 500, {
      code: 'ACTIVITY_STATS_FAILED',
      message: 'Failed to fetch activity stats'
    });
  }
});

router.get('/activity-details', authenticateToken, async (req, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const results: Array<{ id: string; type: string; name: string; details: string; timestamp: string }> = [];

    const [activities] = await pool.execute(`
      SELECT ch.id, ch.action, ch.created_at as timestamp, tc.mark_name as caseName
      FROM case_history ch
      JOIN trademark_cases tc ON ch.case_id = tc.id
      WHERE DATE(ch.created_at) = ? AND tc.deleted_at IS NULL
      ORDER BY ch.created_at DESC
      LIMIT 50
    `, [date]);
    (activities as any[]).forEach(row => {
      results.push({
        id: String(row.id),
        type: 'activity',
        name: row.action || 'Case Update',
        details: row.caseName || '',
        timestamp: row.timestamp
      });
    });

    const [cases] = await pool.execute(`
      SELECT id, mark_name as name, filing_number as details, created_at as timestamp
      FROM trademark_cases
      WHERE DATE(created_at) = ? AND deleted_at IS NULL
    `, [date]);
    (cases as any[]).forEach(row => {
      results.push({
        id: String(row.id),
        type: 'trademark',
        name: row.name || 'New Trademark',
        details: row.details || '',
        timestamp: row.timestamp
      });
    });

    const [clients] = await pool.execute(`
      SELECT id, name, email as details, created_at as timestamp
      FROM clients
      WHERE DATE(created_at) = ? AND deleted_at IS NULL
    `, [date]);
    (clients as any[]).forEach(row => {
      results.push({
        id: String(row.id),
        type: 'client',
        name: row.name || 'New Client',
        details: row.details || '',
        timestamp: row.timestamp
      });
    });

    const [invoices] = await pool.execute(`
      SELECT id, invoice_number as name, CONCAT('$', total_amount, ' - ', status) as details, created_at as timestamp
      FROM invoices
      WHERE DATE(created_at) = ? AND deleted_at IS NULL
    `, [date]);
    (invoices as any[]).forEach(row => {
      results.push({
        id: String(row.id),
        type: 'invoice',
        name: row.name || 'New Invoice',
        details: row.details || '',
        timestamp: row.timestamp
      });
    });

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(results.slice(0, 100));
  } catch (error) {
    logRouteError(req, 'system.activityDetails', error);
    sendApiError(req, res, 500, {
      code: 'ACTIVITY_DETAILS_FAILED',
      message: 'Failed to fetch activity details'
    });
  }
});

export default router;
