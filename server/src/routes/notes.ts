import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const caseIdParamSchema = z.object({ caseId: z.string().min(1) });
const noteIdParamSchema = z.object({ id: z.string().min(1) });

const createNoteSchema = z.object({
  caseId: z.string().min(1),
  content: z.string().min(1),
  noteType: z.string().optional(),
  isPrivate: z.boolean().optional(),
  parentNoteId: z.string().nullable().optional()
});

const updateNoteSchema = z.object({
  content: z.string().optional(),
  noteType: z.string().optional(),
  isPrivate: z.boolean().optional(),
  isPinned: z.boolean().optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: 'No fields to update'
});

const deleteNoteQuerySchema = z.object({
  permanent: z.enum(['true', 'false']).optional()
});

const pinNoteSchema = z.object({
  pinned: z.boolean()
});

const replySchema = z.object({
  content: z.string().min(1)
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
      `SELECT cn.*, u.full_name as user_name
       FROM case_notes cn
       LEFT JOIN users u ON cn.user_id = u.id
       WHERE cn.case_id = ? AND cn.deleted_at IS NULL
       ORDER BY cn.is_pinned DESC, cn.created_at DESC`,
      [parsed.data.caseId]
    );

    res.json(rows);
  } catch (error) {
    logRouteError(req, 'notes.listByCase', error);
    sendApiError(req, res, 500, {
      code: 'NOTES_FETCH_FAILED',
      message: 'Failed to fetch case notes',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const parsed = noteIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_ID',
        message: 'Invalid note id',
        details: parsed.error.flatten()
      });
    }

    const [noteRows] = await pool.execute(
      `SELECT cn.*, u.full_name as user_name
       FROM case_notes cn
       LEFT JOIN users u ON cn.user_id = u.id
       WHERE cn.id = ? AND cn.deleted_at IS NULL`,
      [parsed.data.id]
    );

    if ((noteRows as unknown[]).length === 0) {
      return sendApiError(req, res, 404, {
        code: 'NOTE_NOT_FOUND',
        message: 'Note not found'
      });
    }

    const note = (noteRows as Array<Record<string, unknown>>)[0];
    const [replyRows] = await pool.execute(
      `SELECT cn.*, u.full_name as user_name
       FROM case_notes cn
       LEFT JOIN users u ON cn.user_id = u.id
       WHERE cn.parent_note_id = ? AND cn.deleted_at IS NULL
       ORDER BY cn.created_at ASC`,
      [parsed.data.id]
    );

    note.replies = replyRows;
    res.json(note);
  } catch (error) {
    logRouteError(req, 'notes.getById', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_FETCH_FAILED',
      message: 'Failed to fetch note'
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const parsed = createNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_CREATE_PAYLOAD',
        message: 'Invalid note payload',
        details: parsed.error.flatten()
      });
    }

    const id = crypto.randomUUID();
    await pool.execute(
      `INSERT INTO case_notes (id, case_id, user_id, note_type, content, is_private, parent_note_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        parsed.data.caseId,
        req.user?.id ?? null,
        parsed.data.noteType || 'GENERAL',
        parsed.data.content,
        parsed.data.isPrivate || false,
        parsed.data.parentNoteId || null
      ]
    );

    res.status(201).json({
      id,
      caseId: parsed.data.caseId,
      content: parsed.data.content,
      noteType: parsed.data.noteType || 'GENERAL',
      isPrivate: parsed.data.isPrivate || false,
      parentNoteId: parsed.data.parentNoteId || null,
      createdAt: new Date()
    });
  } catch (error) {
    logRouteError(req, 'notes.create', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_CREATE_FAILED',
      message: 'Failed to create note'
    });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = noteIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_ID',
        message: 'Invalid note id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateNoteSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_UPDATE_PAYLOAD',
        message: 'Invalid note update payload',
        details: parsedBody.error.flatten()
      });
    }

    const fields: string[] = [];
    const values: Array<string | boolean> = [];

    if (parsedBody.data.content !== undefined) {
      fields.push('content = ?');
      values.push(parsedBody.data.content);
    }
    if (parsedBody.data.noteType !== undefined) {
      fields.push('note_type = ?');
      values.push(parsedBody.data.noteType);
    }
    if (parsedBody.data.isPrivate !== undefined) {
      fields.push('is_private = ?');
      values.push(parsedBody.data.isPrivate);
    }
    if (parsedBody.data.isPinned !== undefined) {
      fields.push('is_pinned = ?');
      values.push(parsedBody.data.isPinned);
    }

    values.push(parsedParams.data.id);

    await pool.execute(
      `UPDATE case_notes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
      values
    );

    res.json({ success: true });
  } catch (error) {
    logRouteError(req, 'notes.update', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_UPDATE_FAILED',
      message: 'Failed to update note'
    });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = noteIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_ID',
        message: 'Invalid note id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedQuery = deleteNoteQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_DELETE_QUERY',
        message: 'Invalid note delete query',
        details: parsedQuery.error.flatten()
      });
    }

    const permanent = parsedQuery.data.permanent === 'true';
    if (permanent) {
      await pool.execute('DELETE FROM case_notes WHERE id = ?', [parsedParams.data.id]);
    } else {
      await pool.execute('UPDATE case_notes SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL', [parsedParams.data.id]);
    }

    res.json({ success: true, message: permanent ? 'Note permanently deleted' : 'Note moved to trash' });
  } catch (error) {
    logRouteError(req, 'notes.delete', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_DELETE_FAILED',
      message: 'Failed to delete note'
    });
  }
});

router.patch('/:id/pin', authenticateToken, async (req, res) => {
  try {
    const parsedParams = noteIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_ID',
        message: 'Invalid note id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = pinNoteSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_PIN_PAYLOAD',
        message: 'Invalid pin payload',
        details: parsedBody.error.flatten()
      });
    }

    await pool.execute('UPDATE case_notes SET is_pinned = ? WHERE id = ? AND deleted_at IS NULL', [parsedBody.data.pinned ? 1 : 0, parsedParams.data.id]);
    res.json({ success: true, isPinned: parsedBody.data.pinned });
  } catch (error) {
    logRouteError(req, 'notes.pin', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_PIN_FAILED',
      message: 'Failed to pin note'
    });
  }
});

router.post('/:id/reply', authenticateToken, async (req, res) => {
  try {
    const parsedParams = noteIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_ID',
        message: 'Invalid parent note id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = replySchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_NOTE_REPLY_PAYLOAD',
        message: 'Invalid reply payload',
        details: parsedBody.error.flatten()
      });
    }

    const [parentRows] = await pool.execute('SELECT case_id FROM case_notes WHERE id = ? AND deleted_at IS NULL', [parsedParams.data.id]);
    if ((parentRows as unknown[]).length === 0) {
      return sendApiError(req, res, 404, {
        code: 'PARENT_NOTE_NOT_FOUND',
        message: 'Parent note not found'
      });
    }

    const caseId = ((parentRows as Array<{ case_id: string }>)[0]).case_id;
    const replyId = crypto.randomUUID();

    await pool.execute(
      `INSERT INTO case_notes (id, case_id, user_id, content, parent_note_id, note_type)
       VALUES (?, ?, ?, ?, ?, 'REPLY')`,
      [replyId, caseId, req.user?.id ?? null, parsedBody.data.content, parsedParams.data.id]
    );

    res.status(201).json({
      id: replyId,
      caseId,
      content: parsedBody.data.content,
      parentNoteId: parsedParams.data.id,
      createdAt: new Date()
    });
  } catch (error) {
    logRouteError(req, 'notes.reply', error);
    sendApiError(req, res, 500, {
      code: 'NOTE_REPLY_FAILED',
      message: 'Failed to create reply'
    });
  }
});

export default router;
