import { Router } from 'express';
import { pool } from '../database/db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        country, 
        city, 
        subcity, 
        woreda, 
        house_no as houseNo, 
        telephone, 
        email, 
        po_box as poBox, 
        fax,
        created_at as createdAt
      FROM agents 
      ORDER BY name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agents' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        country, 
        city, 
        subcity, 
        woreda, 
        house_no as houseNo, 
        telephone, 
        email, 
        po_box as poBox, 
        fax,
        created_at as createdAt
      FROM agents 
      WHERE id = ?
    `, [id]);
    
    const agents = rows as any[];
    if (agents.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agents[0] });
  } catch (error) {
    console.error('Failed to fetch agent:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch agent' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, country, city, subcity, woreda, houseNo, telephone, email, poBox, fax } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Agent name is required' });
    }

    const id = crypto.randomUUID();
    await pool.execute(`
      INSERT INTO agents (id, name, country, city, subcity, woreda, house_no, telephone, email, po_box, fax)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, name, country || '', city || '', subcity || '', woreda || '', houseNo || '', telephone || '', email || '', poBox || '', fax || '']);

    const [rows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        country, 
        city, 
        subcity, 
        woreda, 
        house_no as houseNo, 
        telephone, 
        email, 
        po_box as poBox, 
        fax,
        created_at as createdAt
      FROM agents 
      WHERE id = ?
    `, [id]);

    res.status(201).json({ success: true, data: (rows as any[])[0] });
  } catch (error) {
    console.error('Failed to create agent:', error);
    res.status(500).json({ success: false, error: 'Failed to create agent' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, city, subcity, woreda, houseNo, telephone, email, poBox, fax } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: 'Agent name is required' });
    }

    await pool.execute(`
      UPDATE agents 
      SET name = ?, country = ?, city = ?, subcity = ?, woreda = ?, house_no = ?, telephone = ?, email = ?, po_box = ?, fax = ?
      WHERE id = ?
    `, [name, country || '', city || '', subcity || '', woreda || '', houseNo || '', telephone || '', email || '', poBox || '', fax || '', id]);

    const [rows] = await pool.execute(`
      SELECT 
        id, 
        name, 
        country, 
        city, 
        subcity, 
        woreda, 
        house_no as houseNo, 
        telephone, 
        email, 
        po_box as poBox, 
        fax,
        created_at as createdAt
      FROM agents 
      WHERE id = ?
    `, [id]);

    const agents = rows as any[];
    if (agents.length === 0) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }
    res.json({ success: true, data: agents[0] });
  } catch (error) {
    console.error('Failed to update agent:', error);
    res.status(500).json({ success: false, error: 'Failed to update agent' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM agents WHERE id = ?', [id]);
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Failed to delete agent:', error);
    res.status(500).json({ success: false, error: 'Failed to delete agent' });
  }
});

export default router;
