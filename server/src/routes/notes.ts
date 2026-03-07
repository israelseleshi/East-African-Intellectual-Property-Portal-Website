import express from 'express';
import crypto from 'crypto';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all notes for a case
router.get('/case/:caseId', authenticateToken, async (req, res) => {
    try {
        const { caseId } = req.params;
        const [rows] = await pool.execute(
            `SELECT cn.*, u.name as user_name 
             FROM case_notes cn 
             LEFT JOIN users u ON cn.user_id = u.id 
             WHERE cn.case_id = ? AND cn.deleted_at IS NULL 
             ORDER BY cn.is_pinned DESC, cn.created_at DESC`,
            [caseId]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching case notes:', error);
        res.status(500).json({ error: 'Failed to fetch case notes' });
    }
});

// Get single note with replies
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get main note
        const [noteRows] = await pool.execute(
            `SELECT cn.*, u.name as user_name 
             FROM case_notes cn 
             LEFT JOIN users u ON cn.user_id = u.id 
             WHERE cn.id = ? AND cn.deleted_at IS NULL`,
            [id]
        );
        
        if ((noteRows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const note = (noteRows as Array<Record<string, unknown>>)[0];
        
        // Get replies if any
        const [replyRows] = await pool.execute(
            `SELECT cn.*, u.name as user_name 
             FROM case_notes cn 
             LEFT JOIN users u ON cn.user_id = u.id 
             WHERE cn.parent_note_id = ? AND cn.deleted_at IS NULL 
             ORDER BY cn.created_at ASC`,
            [id]
        );
        
        (note as Record<string, unknown>).replies = replyRows;
        res.json(note);
    } catch (error) {
        console.error('Error fetching note:', error);
        res.status(500).json({ error: 'Failed to fetch note' });
    }
});

// Create new note
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const { caseId, content, noteType = 'GENERAL', isPrivate = false, parentNoteId = null } = req.body;
        const userId = req.user.id;
        
        if (!caseId || !content) {
            return res.status(400).json({ error: 'caseId and content are required' });
        }
        
        const id = crypto.randomUUID();
        
        await pool.execute(
            `INSERT INTO case_notes (id, case_id, user_id, note_type, content, is_private, parent_note_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, caseId, userId, noteType, content, isPrivate, parentNoteId]
        );
        
        res.status(201).json({ id, caseId, content, noteType, isPrivate, parentNoteId, createdAt: new Date() });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// Update note
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, noteType, isPrivate, isPinned } = req.body;
        
        const fields: string[] = [];
        const values: any[] = [];
        
        if (content !== undefined) {
            fields.push('content = ?');
            values.push(content);
        }
        if (noteType !== undefined) {
            fields.push('note_type = ?');
            values.push(noteType);
        }
        if (isPrivate !== undefined) {
            fields.push('is_private = ?');
            values.push(isPrivate);
        }
        if (isPinned !== undefined) {
            fields.push('is_pinned = ?');
            values.push(isPinned);
        }
        
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }
        
        fields.push('updated_at = NOW()');
        values.push(id);
        
        await pool.execute(
            `UPDATE case_notes SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            values
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Soft delete note
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const permanent = req.query.permanent === 'true';
        
        if (permanent) {
            await pool.execute('DELETE FROM case_notes WHERE id = ?', [id]);
        } else {
            await pool.execute(
                'UPDATE case_notes SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
                [id]
            );
        }
        
        res.json({ success: true, message: permanent ? 'Note permanently deleted' : 'Note moved to trash' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Pin/unpin note
router.patch('/:id/pin', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { pinned } = req.body;
        
        await pool.execute(
            'UPDATE case_notes SET is_pinned = ? WHERE id = ? AND deleted_at IS NULL',
            [pinned ? 1 : 0, id]
        );
        
        res.json({ success: true, isPinned: pinned });
    } catch (error) {
        console.error('Error pinning note:', error);
        res.status(500).json({ error: 'Failed to pin note' });
    }
});

// Reply to note (create threaded reply)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/:id/reply', authenticateToken, async (req: any, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;
        
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        
        // Get parent note to find case_id
        const [parentRows] = await pool.execute(
            'SELECT case_id FROM case_notes WHERE id = ? AND deleted_at IS NULL',
            [id]
        );
        
        if ((parentRows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Parent note not found' });
        }
        
        const caseId = ((parentRows as unknown[])[0] as { case_id: string }).case_id;
        const replyId = crypto.randomUUID();
        
        await pool.execute(
            `INSERT INTO case_notes (id, case_id, user_id, content, parent_note_id, note_type) 
             VALUES (?, ?, ?, ?, ?, 'REPLY')`,
            [replyId, caseId, userId, content, id]
        );
        
        res.status(201).json({ id: replyId, caseId, content, parentNoteId: id, createdAt: new Date() });
    } catch (error) {
        console.error('Error creating reply:', error);
        res.status(500).json({ error: 'Failed to create reply' });
    }
});

export default router;
