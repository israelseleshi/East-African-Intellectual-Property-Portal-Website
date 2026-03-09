import crypto from 'crypto';
import express from 'express';
import { z } from 'zod';
import { getConnection, pool, query } from '../database/db.js';
import type { ClientRow } from '../database/types.js';
import { authenticateToken } from '../middleware/auth.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';

const router = express.Router();

const clientIdParamSchema = z.object({ id: z.string().min(1) });

const listClientsQuerySchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).optional()
});

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1)
});

const mergeSchema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1)
});

const clientBaseSchema = z.object({
  name: z.string().min(1),
  localName: z.string().optional(),
  local_name: z.string().optional(),
  type: z.string().optional(),
  nationality: z.string().optional(),
  residence_country: z.string().optional(),
  residenceCountry: z.string().optional(),
  email: z.string().optional(),
  addressStreet: z.string().optional(),
  address_street: z.string().optional(),
  addressZone: z.string().optional(),
  address_zone: z.string().optional(),
  wereda: z.string().optional(),
  city: z.string().optional(),
  houseNo: z.string().optional(),
  house_no: z.string().optional(),
  zipCode: z.string().optional(),
  zip_code: z.string().optional(),
  poBox: z.string().optional(),
  po_box: z.string().optional(),
  telephone: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional()
});

const updateClientSchema = clientBaseSchema.partial();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const parsed = listClientsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_QUERY',
        message: 'Invalid clients query',
        details: parsed.error.flatten()
      });
    }

    const { q, type } = parsed.data;
    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 50;
    const offset = (page - 1) * limit;

    let sql = 'FROM clients WHERE 1=1';
    const params: string[] = [];

    if (type && type !== 'ALL') {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (q) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR city LIKE ? OR nationality LIKE ?)';
      const searchVal = `%${q}%`;
      params.push(searchVal, searchVal, searchVal, searchVal);
    }

    const [countResult] = await pool.execute(`SELECT COUNT(*) as count ${sql}`, params);
    const total = (countResult as Array<{ count: number }>)[0].count;

    const [rows] = await pool.execute(
      `SELECT * ${sql} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows as ClientRow[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logRouteError(req, 'clients.list', error);
    sendApiError(req, res, 500, {
      code: 'CLIENTS_FETCH_FAILED',
      message: 'Failed to fetch clients'
    });
  }
});

router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_BULK_DELETE_PAYLOAD',
        message: 'No valid IDs provided',
        details: parsed.error.flatten()
      });
    }

    const placeholders = parsed.data.ids.map(() => '?').join(',');
    await pool.execute(`DELETE FROM clients WHERE id IN (${placeholders})`, parsed.data.ids);

    res.json({ success: true, message: `${parsed.data.ids.length} clients deleted` });
  } catch (error) {
    logRouteError(req, 'clients.bulkDelete', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_BULK_DELETE_FAILED',
      message: 'Failed to delete clients'
    });
  }
});

router.get('/duplicates', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT name, email, COUNT(*) as count
      FROM clients
      GROUP BY name, email
      HAVING count > 1
    `);
    res.json(rows);
  } catch (error) {
    logRouteError(req, 'clients.duplicates', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_DUPLICATES_FAILED',
      message: 'Failed to detect duplicates'
    });
  }
});

router.post('/merge', authenticateToken, async (req, res) => {
  try {
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_MERGE_PAYLOAD',
        message: 'Source and target client IDs are required',
        details: parsed.error.flatten()
      });
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute('UPDATE trademark_cases SET client_id = ? WHERE client_id = ?', [parsed.data.targetId, parsed.data.sourceId]);
      await connection.execute('UPDATE invoices SET client_id = ? WHERE client_id = ?', [parsed.data.targetId, parsed.data.sourceId]);
      await connection.execute('DELETE FROM clients WHERE id = ?', [parsed.data.sourceId]);

      await connection.commit();
      res.json({ success: true, message: 'Clients merged successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    logRouteError(req, 'clients.merge', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_MERGE_FAILED',
      message: 'Failed to merge clients'
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const parsed = clientBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_PAYLOAD',
        message: 'Invalid client payload',
        details: parsed.error.flatten()
      });
    }

    const data = parsed.data;
    const clientId = crypto.randomUUID();

    await query(
      'INSERT INTO clients (id, name, local_name, type, nationality, residence_country, email, address_street, address_zone, wereda, city, house_no, zip_code, po_box, telephone, fax) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        clientId,
        data.name,
        data.localName || data.local_name || null,
        data.type || 'INDIVIDUAL',
        data.nationality || '',
        data.residence_country || data.residenceCountry || '',
        data.email || '',
        data.addressStreet || data.address_street || '',
        data.address_zone || data.addressZone || '',
        data.wereda || '',
        data.city || '',
        data.house_no || data.houseNo || '',
        data.zipCode || data.zip_code || '',
        data.po_box || data.poBox || '',
        data.telephone || data.phone || '',
        data.fax || ''
      ]
    );

    res.status(201).json({ id: clientId, ...data });
  } catch (error) {
    logRouteError(req, 'clients.create', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_CREATE_FAILED',
      message: 'Failed to create client',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const parsed = clientIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_ID',
        message: 'Invalid client id',
        details: parsed.error.flatten()
      });
    }

    const [rows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [parsed.data.id]);
    const client = (rows as unknown[])[0];
    if (!client) {
      return sendApiError(req, res, 404, {
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found'
      });
    }

    const [trademarks] = await pool.execute(
      'SELECT id, mark_name, status, jurisdiction, filing_number, created_at FROM trademark_cases WHERE client_id = ? ORDER BY created_at DESC',
      [parsed.data.id]
    );

    res.json({ ...client, trademarks });
  } catch (error) {
    logRouteError(req, 'clients.getById', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_FETCH_FAILED',
      message: 'Failed to fetch client'
    });
  }
});

router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const parsedParams = clientIdParamSchema.safeParse(req.params);
    if (!parsedParams.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_ID',
        message: 'Invalid client id',
        details: parsedParams.error.flatten()
      });
    }

    const parsedBody = updateClientSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_UPDATE_PAYLOAD',
        message: 'Invalid client update payload',
        details: parsedBody.error.flatten()
      });
    }

    const [existing] = await pool.execute('SELECT id FROM clients WHERE id = ?', [parsedParams.data.id]);
    if ((existing as unknown[]).length === 0) {
      return sendApiError(req, res, 404, {
        code: 'CLIENT_NOT_FOUND',
        message: 'Client not found'
      });
    }

    const data = parsedBody.data;
    const updates: Record<string, string | null> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.localName !== undefined || data.local_name !== undefined) updates.local_name = data.localName || data.local_name || null;
    if (data.type !== undefined) updates.type = data.type;
    if (data.nationality !== undefined) updates.nationality = data.nationality;
    if (data.residence_country !== undefined || data.residenceCountry !== undefined) updates.residence_country = data.residence_country || data.residenceCountry || null;
    if (data.email !== undefined) updates.email = data.email;
    if (data.addressStreet !== undefined || data.address_street !== undefined) updates.address_street = data.addressStreet || data.address_street || null;
    if (data.addressZone !== undefined || data.address_zone !== undefined) updates.address_zone = data.addressZone || data.address_zone || null;
    if (data.wereda !== undefined) updates.wereda = data.wereda;
    if (data.city !== undefined) updates.city = data.city;
    if (data.houseNo !== undefined || data.house_no !== undefined) updates.house_no = data.houseNo || data.house_no || null;
    if (data.zipCode !== undefined || data.zip_code !== undefined) updates.zip_code = data.zipCode || data.zip_code || null;
    if (data.poBox !== undefined || data.po_box !== undefined) updates.po_box = data.poBox || data.po_box || null;
    if (data.telephone !== undefined || data.phone !== undefined) updates.telephone = data.telephone || data.phone || null;
    if (data.fax !== undefined) updates.fax = data.fax;

    if (Object.keys(updates).length === 0) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_CLIENT_UPDATE_PAYLOAD',
        message: 'No valid client fields to update'
      });
    }

    const setClause = Object.keys(updates).map((key) => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    values.push(parsedParams.data.id);

    await pool.execute(`UPDATE clients SET ${setClause} WHERE id = ?`, values);
    res.json({ id: parsedParams.data.id, ...updates });
  } catch (error) {
    logRouteError(req, 'clients.update', error);
    sendApiError(req, res, 500, {
      code: 'CLIENT_UPDATE_FAILED',
      message: 'Failed to update client',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
