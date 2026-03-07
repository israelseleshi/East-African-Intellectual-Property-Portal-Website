import express from 'express';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all jurisdictions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM jurisdictions WHERE is_active = TRUE ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching jurisdictions:', error);
        res.status(500).json({ error: 'Failed to fetch jurisdictions' });
    }
});

// Get specific jurisdiction
router.get('/:code', authenticateToken, async (req, res) => {
    try {
        const { code } = req.params;
        const [rows] = await pool.execute(
            'SELECT * FROM jurisdictions WHERE code = ? AND is_active = TRUE',
            [code]
        );
        if ((rows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Jurisdiction not found' });
        }
        res.json((rows as unknown[])[0]);
    } catch (error) {
        console.error('Error fetching jurisdiction:', error);
        res.status(500).json({ error: 'Failed to fetch jurisdiction' });
    }
});

// Get jurisdiction rules summary (for UI display)
router.get('/:code/rules', authenticateToken, async (req, res) => {
    try {
        const { code } = req.params;
        const [rows] = await pool.execute(
            `SELECT code, name, opposition_period_days, renewal_period_years, 
                    grace_period_months, currency_code, requires_power_of_attorney, 
                    requires_notarization, multi_class_filing_allowed, rules_summary 
             FROM jurisdictions WHERE code = ? AND is_active = TRUE`,
            [code]
        );
        if ((rows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Jurisdiction not found' });
        }
        res.json((rows as unknown[])[0]);
    } catch (error) {
        console.error('Error fetching jurisdiction rules:', error);
        res.status(500).json({ error: 'Failed to fetch jurisdiction rules' });
    }
});

// Calculate deadlines based on jurisdiction rules
router.post('/:code/calculate-deadlines', authenticateToken, async (req, res) => {
    try {
        const { code } = req.params;
        const { triggerDate, stage } = req.body;
        
        const [rows] = await pool.execute(
            'SELECT opposition_period_days, renewal_period_years FROM jurisdictions WHERE code = ?',
            [code]
        );
        
        if ((rows as unknown[]).length === 0) {
            return res.status(404).json({ error: 'Jurisdiction not found' });
        }
        
        const rules = (rows as Array<{ opposition_period_days: number; renewal_period_years: number }>)[0];
        const baseDate = triggerDate ? new Date(triggerDate) : new Date();
        
        const deadlines: Record<string, Date> = {};
        
        switch (stage) {
            case 'PUBLISHED':
                deadlines.opposition_deadline = new Date(baseDate);
                deadlines.opposition_deadline.setDate(baseDate.getDate() + rules.opposition_period_days);
                break;
            case 'REGISTERED':
                deadlines.renewal_due = new Date(baseDate);
                deadlines.renewal_due.setFullYear(baseDate.getFullYear() + rules.renewal_period_years);
                break;
        }
        
        res.json({
            jurisdiction: code,
            stage,
            trigger_date: baseDate,
            deadlines,
            rules_applied: {
                opposition_period_days: rules.opposition_period_days,
                renewal_period_years: rules.renewal_period_years
            }
        });
    } catch (error) {
        console.error('Error calculating deadlines:', error);
        res.status(500).json({ error: 'Failed to calculate deadlines' });
    }
});

// Admin: Add new jurisdiction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        // Check if admin (simplified - add proper admin check)
        const data = req.body;
        
        await pool.execute(
            `INSERT INTO jurisdictions (code, name, country_code, opposition_period_days, 
             renewal_period_years, grace_period_months, currency_code, requires_power_of_attorney,
             requires_notarization, multi_class_filing_allowed, rules_summary, official_language)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [data.code, data.name, data.country_code || null, data.opposition_period_days || 60,
             data.renewal_period_years || 10, data.grace_period_months || 6, data.currency_code || 'USD',
             data.requires_power_of_attorney !== false, data.requires_notarization || false,
             data.multi_class_filing_allowed !== false, data.rules_summary || null,
             data.official_language || null]
        );
        
        res.status(201).json({ success: true, code: data.code });
    } catch (error: unknown) {
        console.error('Error creating jurisdiction:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Jurisdiction code already exists' });
        }
        res.status(500).json({ error: 'Failed to create jurisdiction' });
    }
});

// Admin: Update jurisdiction
router.patch('/:code', authenticateToken, async (req, res) => {
    try {
        const { code } = req.params;
        const updates = req.body;
        
        const allowedFields = [
            'name', 'opposition_period_days', 'renewal_period_years', 'grace_period_months',
            'currency_code', 'requires_power_of_attorney', 'requires_notarization',
            'multi_class_filing_allowed', 'rules_summary', 'official_language', 'is_active'
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
        
        values.push(code);
        
        await pool.execute(
            `UPDATE jurisdictions SET ${fields.join(', ')}, updated_at = NOW() WHERE code = ?`,
            values
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating jurisdiction:', error);
        res.status(500).json({ error: 'Failed to update jurisdiction' });
    }
});

export default router;
