import express from 'express';
import crypto from 'crypto';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all oppositions (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, caseId, pending } = req.query;
        
        let sql = `
            SELECT o.*, tc.mark_name, c.name as client_name, tc.jurisdiction
            FROM oppositions o
            JOIN trademark_cases tc ON o.case_id = tc.id
            JOIN clients c ON tc.client_id = c.id
            WHERE o.deleted_at IS NULL
        `;
        const params: any[] = [];
        
        if (status) {
            sql += ' AND o.status = ?';
            params.push(status);
        }
        
        if (caseId) {
            sql += ' AND o.case_id = ?';
            params.push(caseId);
        }
        
        if (pending === 'true') {
            sql += ' AND o.status = "PENDING" AND o.deadline_date >= CURDATE()';
        }
        
        sql += ' ORDER BY o.deadline_date ASC';
        
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching oppositions:', error);
        res.status(500).json({ error: 'Failed to fetch oppositions' });
    }
});

// Get oppositions for a specific case
router.get('/case/:caseId', authenticateToken, async (req, res) => {
    try {
        const { caseId } = req.params;
        
        const [rows] = await pool.execute(
            `SELECT o.*, tc.mark_name 
             FROM oppositions o
             JOIN trademark_cases tc ON o.case_id = tc.id
             WHERE o.case_id = ? AND o.deleted_at IS NULL
             ORDER BY o.created_at DESC`,
            [caseId]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching case oppositions:', error);
        res.status(500).json({ error: 'Failed to fetch oppositions' });
    }
});

// Get single opposition
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await pool.execute(
            `SELECT o.*, tc.mark_name, c.name as client_name, tc.jurisdiction
             FROM oppositions o
             JOIN trademark_cases tc ON o.case_id = tc.id
             JOIN clients c ON tc.client_id = c.id
             WHERE o.id = ? AND o.deleted_at IS NULL`,
            [String(id)] as any[]
        ) as [any, any];
        
        if ((rows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Opposition not found' });
        }
        
        res.json((rows as unknown[])[0]);
    } catch (error) {
        console.error('Error fetching opposition:', error);
        res.status(500).json({ error: 'Failed to fetch opposition' });
    }
});

// Create new opposition
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const {
            caseId,
            opponentName,
            opponentAddress,
            opponentRepresentative,
            grounds,
            oppositionDate,
            deadlineDate,
            notes
        } = req.body;
        
        if (!caseId || !opponentName || !grounds) {
            return res.status(400).json({ error: 'caseId, opponentName, and grounds are required' });
        }
        
        // Calculate deadline if not provided (based on jurisdiction)
        let calculatedDeadline = deadlineDate;
        if (!calculatedDeadline && oppositionDate) {
            const [jurisdictionRows] = await pool.execute(
                `SELECT j.opposition_period_days 
                 FROM trademark_cases tc
                 JOIN jurisdictions j ON tc.jurisdiction = j.code
                 WHERE tc.id = ?`,
                [caseId]
            );
            
            if ((jurisdictionRows as unknown[]).length > 0) {
                const days = ((jurisdictionRows as unknown[])[0] as { opposition_period_days: number }).opposition_period_days || 60;
                const oppDate = new Date(oppositionDate);
                oppDate.setDate(oppDate.getDate() + days);
                calculatedDeadline = oppDate.toISOString().split('T')[0];
            }
        }
        
        const id = crypto.randomUUID();
        const userId = req.user.id;
        
        await pool.execute(
            `INSERT INTO oppositions (id, case_id, opponent_name, opponent_address, 
             opponent_representative, grounds, opposition_date, deadline_date, notes, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, caseId, opponentName, opponentAddress || null, opponentRepresentative || null,
             grounds, oppositionDate || new Date(), calculatedDeadline || null, notes || null, userId]
        );
        
        // Create deadline reminder for the opposition response
        if (calculatedDeadline) {
            await pool.execute(
                `INSERT INTO deadlines (id, case_id, due_date, type, description)
                 VALUES (?, ?, ?, 'OPPOSITION_RESPONSE', ?)`,
                [crypto.randomUUID(), caseId, calculatedDeadline, 
                 `Response deadline for opposition by ${opponentName}`]
            );
        }
        
        res.status(201).json({ 
            id, 
            caseId, 
            opponentName, 
            grounds, 
            oppositionDate, 
            deadlineDate: calculatedDeadline,
            status: 'PENDING'
        });
    } catch (error) {
        console.error('Error creating opposition:', error);
        res.status(500).json({ error: 'Failed to create opposition' });
    }
});

// Update opposition
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const allowedFields = [
            'opponent_name', 'opponent_address', 'opponent_representative', 
            'grounds', 'opposition_date', 'deadline_date', 'status', 
            'response_filed_date', 'response_document_path', 'outcome', 'notes'
        ];
        
        const fields: string[] = [];
        const values: any[] = [];
        
        for (const key of allowedFields) {
            if (updates[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(updates[key]);
            }
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        fields.push('updated_at = NOW()');
        values.push(id);
        
        await pool.execute(
            `UPDATE oppositions SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            values
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating opposition:', error);
        res.status(500).json({ error: 'Failed to update opposition' });
    }
});

// Update opposition status
router.patch('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, responseFiledDate, outcome } = req.body;
        
        const validStatuses = ['PENDING', 'RESPONDED', 'WITHDRAWN', 'RESOLVED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }
        
        const updates: Record<string, unknown> = { status, updated_at: 'NOW()' };
        if (status === 'RESPONDED' && responseFiledDate) {
            updates.response_filed_date = responseFiledDate;
        }
        if (outcome) {
            updates.outcome = outcome;
        }
        
        const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = [...Object.values(updates), id] as any[];
        
        await pool.execute(
            `UPDATE oppositions SET ${fields} WHERE id = ? AND deleted_at IS NULL`,
            values
        );
        
        res.json({ success: true, status });
    } catch (error) {
        console.error('Error updating opposition status:', error);
        res.status(500).json({ error: 'Failed to update opposition status' });
    }
});

// Soft delete opposition
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const permanent = req.query.permanent === 'true';
        
        if (permanent) {
            await pool.execute('DELETE FROM oppositions WHERE id = ?', [id]);
        } else {
            await pool.execute(
                'UPDATE oppositions SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
                [id]
            );
        }
        
        res.json({ 
            success: true, 
            message: permanent ? 'Opposition permanently deleted' : 'Opposition moved to trash' 
        });
    } catch (error) {
        console.error('Error deleting opposition:', error);
        res.status(500).json({ error: 'Failed to delete opposition' });
    }
});

// Get pending oppositions with approaching deadlines (dashboard widget)
router.get('/dashboard/pending', authenticateToken, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
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
            [Number(days)]
        );
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching pending oppositions:', error);
        res.status(500).json({ error: 'Failed to fetch pending oppositions' });
    }
});

export default router;
