import express from 'express';
import crypto from 'crypto';
import { pool, query, getConnection } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import type { ClientRow } from '../database/types.js';

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { q, type, page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        let sql = 'FROM clients WHERE 1=1';
        const params: any[] = [];

        if (type && type !== 'ALL') {
            sql += ' AND type = ?';
            params.push(type);
        }

        if (q) {
            // Fuzzy search on name and email
            sql += ' AND (name LIKE ? OR email LIKE ? OR city LIKE ? OR nationality LIKE ?)';
            const searchVal = `%${q}%`;
            params.push(searchVal, searchVal, searchVal, searchVal);
        }

        const [countResult] = await pool.execute(`SELECT COUNT(*) as count ${sql}`, params);
        const total = (countResult as Array<{ count: number }>)[0].count;

        const [rows] = await pool.execute(
            `SELECT * ${sql} ORDER BY name ASC LIMIT ? OFFSET ?`,
            [...params, Number(limit), offset] as any[]
        );

        res.json({
            data: rows as ClientRow[],
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
});

router.post('/bulk-delete', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No IDs provided' });
        }

        // We should check if clients have active cases before deleting, 
        // but for now we follow the "delete" instruction.
        const placeholders = ids.map(() => '?').join(',');
        await pool.execute(`DELETE FROM clients WHERE id IN (${placeholders})`, ids);

        res.json({ success: true, message: `${ids.length} clients deleted` });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to delete clients' });
    }
});

router.get('/duplicates', authenticateToken, async (req, res) => {
    try {
        // Simple duplicate detection by name or email
        const [rows] = await pool.execute(`
            SELECT name, email, COUNT(*) as count 
            FROM clients 
            GROUP BY name, email 
            HAVING count > 1
        `);
        res.json(rows);
    } catch {
        res.status(500).json({ error: 'Failed to detect duplicates' });
    }
});

router.post('/merge', authenticateToken, async (req, res) => {
    try {
        const { sourceId, targetId } = req.body;
        if (!sourceId || !targetId) {
            return res.status(400).json({ error: 'Source and target client IDs required' });
        }

        const connection = await getConnection();
        try {
            await connection.beginTransaction();

            // Update all trademark cases to point to target client
            await connection.execute(
                'UPDATE trademark_cases SET client_id = ? WHERE client_id = ?',
                [targetId, sourceId]
            );

            // Update all invoices to point to target client
            await connection.execute(
                'UPDATE invoices SET client_id = ? WHERE client_id = ?',
                [targetId, sourceId]
            );

            // Delete the source client
            await connection.execute('DELETE FROM clients WHERE id = ?', [sourceId]);

            await connection.commit();
            res.json({ success: true, message: 'Clients merged successfully' });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Merge error:', error);
        res.status(500).json({ error: 'Failed to merge clients' });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const d = req.body;
        const clientId = crypto.randomUUID();
        await query(
            'INSERT INTO clients (id, name, local_name, type, nationality, email, address_street, city, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [clientId, d.name, d.localName || d.local_name || null, d.type, d.nationality, d.email || '', d.addressStreet, d.city || '', d.zipCode || '']
        );
        res.status(201).json({ id: clientId, ...d });
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Generation failed', details: (error as Error).message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.execute('SELECT * FROM clients WHERE id = ?', [id]);
        const client = (rows as unknown[])[0];
        if (!client) return res.status(404).json({ error: 'Client not found' });

        // Fetch associated trademarks
        const [trademarks] = await pool.execute(
            'SELECT id, mark_name, status, jurisdiction, filing_number, created_at FROM trademark_cases WHERE client_id = ? ORDER BY created_at DESC',
            [id]
        );

        res.json({
            ...client,
            trademarks
        });
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
});

router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const d = req.body;

        const [existing] = await pool.execute('SELECT id FROM clients WHERE id = ?', [id]);
        if ((existing as unknown[]).length === 0) return res.status(404).json({ error: 'Client not found' });

        const updates = {
            name: d.name,
            local_name: d.localName || d.local_name,
            type: d.type,
            nationality: d.nationality,
            email: d.email,
            address_street: d.addressStreet || d.address_street,
            city: d.city,
            zip_code: d.zipCode || d.zip_code
        };

        await pool.execute(
            'UPDATE clients SET name = ?, local_name = ?, type = ?, nationality = ?, email = ?, address_street = ?, city = ?, zip_code = ? WHERE id = ?',
            [updates.name, updates.local_name, updates.type, updates.nationality, updates.email, updates.address_street, updates.city, updates.zip_code, id]
        );

        res.json({ id, ...updates });
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.status(500).json({ error: 'Failed to update client', details: (error as any).message });
    }
});

export default router;
