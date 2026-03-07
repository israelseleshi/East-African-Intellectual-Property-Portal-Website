import express from 'express';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/upcoming', authenticateToken, async (req, res) => {
    try {
        const days = parseInt(req.query.days as string) || 30;
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
        console.error('Error fetching upcoming deadlines:', error);
        res.status(500).json({ error: 'Failed to fetch deadlines' });
    }
});

router.patch('/:id/complete', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.execute('UPDATE deadlines SET is_completed = TRUE WHERE id = ?', [id]);
        res.json({ id, is_completed: true });
    } catch (error) {
        console.error('Error completing deadline:', error);
        res.status(500).json({ error: 'Failed to complete deadline' });
    }
});

export default router;
