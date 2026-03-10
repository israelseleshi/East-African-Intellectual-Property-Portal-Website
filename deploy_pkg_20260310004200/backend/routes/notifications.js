import express from 'express';
import crypto from 'crypto';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
const router = express.Router();
// Get notifications for current user
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, type, unread, limit = 50 } = req.query;
        let sql = `
            SELECT n.*, tc.mark_name, c.name as client_name
            FROM notifications n
            LEFT JOIN trademark_cases tc ON n.case_id = tc.id
            LEFT JOIN clients c ON tc.client_id = c.id
            WHERE n.recipient_type = 'USER' AND n.recipient_id = ? AND n.deleted_at IS NULL
        `;
        const params = [userId];
        if (status) {
            sql += ' AND n.status = ?';
            params.push(status);
        }
        if (type) {
            sql += ' AND n.type = ?';
            params.push(type);
        }
        if (unread === 'true') {
            sql += ' AND n.read_at IS NULL';
        }
        sql += ' ORDER BY n.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
// Get unread count (for notification bell badge)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/unread/count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(`SELECT COUNT(*) as unread_count FROM notifications 
             WHERE recipient_type = 'USER' AND recipient_id = ? 
             AND read_at IS NULL AND deleted_at IS NULL`, [userId]);
        res.json({ unread_count: rows[0].unread_count });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});
// Get single notification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const [rows] = await pool.execute(`SELECT n.*, tc.mark_name, c.name as client_name
             FROM notifications n
             LEFT JOIN trademark_cases tc ON n.case_id = tc.id
             LEFT JOIN clients c ON tc.client_id = c.id
             WHERE n.id = ? AND n.recipient_id = ? AND n.deleted_at IS NULL`, [id, userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(rows[0]);
    }
    catch (error) {
        console.error('Error fetching notification:', error);
        res.status(500).json({ error: 'Failed to fetch notification' });
    }
});
// Mark notification as read
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.patch('/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await pool.execute(`UPDATE notifications SET read_at = NOW() 
             WHERE id = ? AND recipient_id = ? AND deleted_at IS NULL`, [id, userId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});
// Mark all notifications as read
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.patch('/read-all', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [result] = await pool.execute(`UPDATE notifications SET read_at = NOW() 
             WHERE recipient_type = 'USER' AND recipient_id = ? 
             AND read_at IS NULL AND deleted_at IS NULL`, [userId]);
        res.json({ success: true, marked_read: result.affectedRows });
    }
    catch (error) {
        console.error('Error marking all as read:', error);
        res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
});
// Create notification (internal/system use)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { recipientType, recipientId, caseId, type, channel, subject, content, metadata } = req.body;
        if (!recipientType || !recipientId || !type || !channel) {
            return res.status(400).json({
                error: 'recipientType, recipientId, type, and channel are required'
            });
        }
        const id = crypto.randomUUID();
        await pool.execute(`INSERT INTO notifications (id, recipient_type, recipient_id, case_id, type, 
             channel, subject, content, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, recipientType, recipientId, caseId || null, type, channel,
            subject || null, content || null, metadata ? JSON.stringify(metadata) : null]);
        res.status(201).json({
            id,
            recipientType,
            recipientId,
            type,
            channel,
            status: 'PENDING',
            createdAt: new Date()
        });
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});
// Update notification status (for delivery tracking)
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, errorMessage } = req.body;
        const validStatuses = ['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        const fields = ['status = ?'];
        const values = [status];
        if (status === 'SENT') {
            fields.push('sent_at = NOW()');
        }
        if (status === 'DELIVERED') {
            fields.push('delivered_at = NOW()');
        }
        if (status === 'FAILED' && errorMessage) {
            fields.push('error_message = ?');
            values.push(errorMessage);
            fields.push('retry_count = retry_count + 1');
        }
        values.push(id);
        await pool.execute(`UPDATE notifications SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, status });
    }
    catch (error) {
        console.error('Error updating notification status:', error);
        res.status(500).json({ error: 'Failed to update notification status' });
    }
});
// Soft delete notification
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const permanent = req.query.permanent === 'true';
        if (permanent) {
            await pool.execute('DELETE FROM notifications WHERE id = ? AND recipient_id = ?', [id, userId]);
        }
        else {
            await pool.execute(`UPDATE notifications SET deleted_at = NOW() 
                 WHERE id = ? AND recipient_id = ?`, [id, userId]);
        }
        res.json({
            success: true,
            message: permanent ? 'Notification permanently deleted' : 'Notification removed'
        });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});
// Admin: Get all notifications (with filters)
router.get('/admin/all', authenticateToken, async (req, res) => {
    try {
        const { status, type, channel, dateFrom, dateTo, limit = 100 } = req.query;
        let sql = `
            SELECT n.*, u.name as recipient_name, tc.mark_name
            FROM notifications n
            LEFT JOIN users u ON n.recipient_id = u.id AND n.recipient_type = 'USER'
            LEFT JOIN trademark_cases tc ON n.case_id = tc.id
            WHERE n.deleted_at IS NULL
        `;
        const params = [];
        if (status) {
            sql += ' AND n.status = ?';
            params.push(status);
        }
        if (type) {
            sql += ' AND n.type = ?';
            params.push(type);
        }
        if (channel) {
            sql += ' AND n.channel = ?';
            params.push(channel);
        }
        if (dateFrom) {
            sql += ' AND n.created_at >= ?';
            params.push(dateFrom);
        }
        if (dateTo) {
            sql += ' AND n.created_at <= ?';
            params.push(dateTo);
        }
        sql += ' ORDER BY n.created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
// Get notification statistics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await pool.execute(`SELECT 
                status,
                COUNT(*) as count
             FROM notifications
             WHERE recipient_type = 'USER' AND recipient_id = ? AND deleted_at IS NULL
             GROUP BY status`, [userId]);
        const [typeRows] = await pool.execute(`SELECT 
                type,
                COUNT(*) as count
             FROM notifications
             WHERE recipient_type = 'USER' AND recipient_id = ? AND deleted_at IS NULL
             GROUP BY type`, [userId]);
        res.json({
            by_status: rows,
            by_type: typeRows
        });
    }
    catch (error) {
        console.error('Error fetching notification stats:', error);
        res.status(500).json({ error: 'Failed to fetch notification statistics' });
    }
});
export default router;
