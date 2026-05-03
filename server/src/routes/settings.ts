import { Router } from 'express';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { csrfMiddleware } from '../middleware/csrf.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadDir } from '../utils/constants.js';

const router = Router();

const TABLE_NAME = 'company_settings';
const LOGO_DIR = path.join(uploadDir, 'company_logo');

// Ensure directory exists
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, LOGO_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    (new Error('Only images are allowed (jpeg, jpg, png, webp)'));
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, company_name, company_address, company_city, company_email, 
              company_phone, company_website, tax_id, logo_url, created_at, updated_at 
       FROM ${TABLE_NAME} LIMIT 1`
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({
        companyName: 'EAST AFRICAN INTELLECTUAL PROPERTY',
        companyAddress: '',
        companyCity: 'Addis Ababa, Ethiopia',
        companyEmail: 'info@eastafricanip.com',
        companyPhone: '',
        companyWebsite: 'www.eastafricanip.com',
        taxId: '',
        logoUrl: ''
      });
    }
    
    const row = rows[0] as any;
    res.json({
      id: row.id,
      companyName: row.company_name,
      companyAddress: row.company_address,
      companyCity: row.company_city,
      companyEmail: row.company_email,
      companyPhone: row.company_phone,
      companyWebsite: row.company_website,
      taxId: row.tax_id,
      logoUrl: row.logo_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('[settings.get]', error);
    res.status(500).json({ error: 'Failed to fetch company settings' });
  }
});

router.put('/', authenticateToken, csrfMiddleware, async (req, res) => {
  try {
    const { 
      companyName, 
      companyAddress, 
      companyCity, 
      companyEmail, 
      companyPhone, 
      companyWebsite, 
      taxId,
      logoUrl 
    } = req.body;

    await pool.query(
      `INSERT INTO ${TABLE_NAME} (id, company_name, company_address, company_city, company_email, 
                              company_phone, company_website, tax_id, logo_url)
       VALUES ('00000000-0000-0000-0000-000000000001', ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         company_name = COALESCE(?, company_name),
         company_address = COALESCE(?, company_address),
         company_city = COALESCE(?, company_city),
         company_email = COALESCE(?, company_email),
         company_phone = COALESCE(?, company_phone),
         company_website = COALESCE(?, company_website),
         tax_id = COALESCE(?, tax_id),
         logo_url = COALESCE(?, logo_url),
         updated_at = CURRENT_TIMESTAMP`,
      [
        companyName, companyAddress, companyCity, companyEmail, companyPhone, companyWebsite, taxId, logoUrl,
        companyName, companyAddress, companyCity, companyEmail, companyPhone, companyWebsite, taxId, logoUrl
      ]
    );

    res.json({ success: true, message: 'Company settings updated' });
  } catch (error: any) {
    console.error('[settings.update]', error);
    res.status(500).json({ error: 'Failed to update company settings' });
  }
});

router.post('/logo', authenticateToken, (req, res) => {
  upload.single('logo')(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No logo file provided' });
      }

      const logoUrl = `/uploads/company_logo/${req.file.filename}`;
      
      // Update database immediately
      await pool.query(
        `UPDATE ${TABLE_NAME} SET logo_url = ? WHERE id = '00000000-0000-0000-0000-000000000001'`,
        [logoUrl]
      );

      res.json({ success: true, logoUrl });
    } catch (error) {
      console.error('[settings.logo]', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });
});

export default router;