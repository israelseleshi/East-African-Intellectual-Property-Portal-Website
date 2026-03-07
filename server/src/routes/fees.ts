import express from 'express';
import crypto from 'crypto';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all fee schedules (with filters)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { jurisdiction, stage, category, active } = req.query;
        
        let sql = `
            SELECT fs.*, j.name as jurisdiction_name, u.name as created_by_name
            FROM fee_schedules fs
            LEFT JOIN jurisdictions j ON fs.jurisdiction = j.code
            LEFT JOIN users u ON fs.created_by = u.id
            WHERE fs.deleted_at IS NULL
        `;
        const params: unknown[] = [];
        
        if (jurisdiction) {
            sql += ' AND fs.jurisdiction = ?';
            params.push(jurisdiction);
        }
        
        if (stage) {
            sql += ' AND fs.stage = ?';
            params.push(stage);
        }
        
        if (category) {
            sql += ' AND fs.category = ?';
            params.push(category);
        }
        
        if (active === 'true') {
            sql += ' AND fs.is_active = TRUE AND (fs.expiry_date IS NULL OR fs.expiry_date >= CURDATE())';
        }
        
        sql += ' ORDER BY fs.jurisdiction, fs.stage, fs.category, fs.effective_date DESC';
        
        const [rows] = await pool.execute(sql, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching fee schedules:', error);
        res.status(500).json({ error: 'Failed to fetch fee schedules' });
    }
});

// Get fees for specific jurisdiction and stage
router.get('/calculate/:jurisdiction/:stage', authenticateToken, async (req, res) => {
    try {
        const { jurisdiction, stage } = req.params;
        
        const [rows] = await pool.execute(
            `SELECT * FROM fee_schedules 
             WHERE jurisdiction = ? AND stage = ? AND is_active = TRUE 
             AND deleted_at IS NULL
             AND (expiry_date IS NULL OR expiry_date >= CURDATE())
             ORDER BY category`,
            [jurisdiction, stage]
        ) as [unknown[], unknown[]];
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                error: 'No fees found for this jurisdiction and stage',
                jurisdiction,
                stage
            });
        }
        
        const fees = rows as Array<{ amount: number; currency: string }>;
        const totalAmount = fees.reduce((sum, fee) => sum + Number(fee.amount), 0);
        
        res.json({
            jurisdiction,
            stage,
            fees,
            total_amount: totalAmount,
            currency: (fees as Array<{ currency: string }>)[0]?.currency || 'USD'
        });
    } catch (error) {
        console.error('Error calculating fees:', error);
        res.status(500).json({ error: 'Failed to calculate fees' });
    }
});

// Calculate total fees for a case (all stages up to current)
router.get('/case/:caseId', authenticateToken, async (req, res) => {
    try {
        const { caseId } = req.params;
        
        // Get case details
        const [caseRows] = await pool.execute(
            'SELECT jurisdiction, status, flow_stage FROM trademark_cases WHERE id = ? AND deleted_at IS NULL',
            [caseId]
        ) as [unknown[], unknown[]];
        
        if (caseRows.length === 0) {
            return res.status(404).json({ error: 'Case not found' });
        }
        
        const caseData = caseRows[0] as Record<string, unknown>;
        const jurisdiction = caseData.jurisdiction as string;
        
        // Define stage order for calculation
        const stageOrder = [
            'DRAFT', 'DATA_COLLECTION', 'READY_TO_FILE', 'FILED', 
            'FORMAL_EXAM', 'SUBSTANTIVE_EXAM', 'AMENDMENT_PENDING',
            'PUBLISHED', 'CERTIFICATE_REQUEST', 'CERTIFICATE_ISSUED',
            'REGISTERED', 'RENEWAL_DUE', 'RENEWAL_ON_TIME', 'RENEWAL_PENALTY'
        ];
        
        const currentStageIndex = stageOrder.indexOf(caseData.flow_stage as string);
        const stagesToBill = stageOrder.slice(0, currentStageIndex + 1);
        
        // Get fees for all applicable stages
        const feesByStage: Record<string, unknown[]> = {};
        let totalAmount = 0;
        
        for (const stage of stagesToBill) {
            const [feeRows] = await pool.execute(
                `SELECT * FROM fee_schedules 
                 WHERE jurisdiction = ? AND stage = ? AND is_active = TRUE 
                 AND deleted_at IS NULL
                 AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
                [jurisdiction, stage]
            ) as [unknown[], unknown[]];
            
            if (feeRows.length > 0) {
                feesByStage[stage] = feeRows;
                totalAmount += (feeRows as Array<{ amount: string }>).reduce((sum, fee) => sum + parseFloat(fee.amount), 0);
            }
        }
        
        res.json({
            case_id: caseId,
            jurisdiction,
            current_stage: caseData.flow_stage as string,
            stages_billed: stagesToBill,
            fees_by_stage: feesByStage,
            total_amount: totalAmount,
            currency: 'USD'
        });
    } catch (error) {
        console.error('Error calculating case fees:', error);
        res.status(500).json({ error: 'Failed to calculate case fees' });
    }
});

// Create new fee schedule (admin only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const {
            jurisdiction,
            stage,
            category,
            amount,
            currency,
            effectiveDate,
            expiryDate,
            description
        } = req.body;
        
        if (!jurisdiction || !stage || !category || amount === undefined) {
            return res.status(400).json({ 
                error: 'jurisdiction, stage, category, and amount are required' 
            });
        }
        
        const id = crypto.randomUUID();
        const userId = req.user.id;
        
        await pool.execute(
            `INSERT INTO fee_schedules (id, jurisdiction, stage, category, amount, currency, 
             effective_date, expiry_date, description, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, jurisdiction, stage, category, amount, currency || 'USD', 
             effectiveDate || new Date(), expiryDate || null, description || null, userId]
        );
        
        res.status(201).json({ 
            id, 
            jurisdiction, 
            stage, 
            category, 
            amount, 
            currency: currency || 'USD',
            effectiveDate: effectiveDate || new Date()
        });
    } catch (error: unknown) {
        console.error('Error creating fee schedule:', error);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ 
                error: 'Fee schedule already exists for this jurisdiction, stage, category, and effective date' 
            });
        }
        res.status(500).json({ error: 'Failed to create fee schedule' });
    }
});

// Update fee schedule
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const allowedFields = [
            'amount', 'currency', 'description', 'is_active', 'expiry_date'
        ];
        
        const fields: string[] = [];
        const values: unknown[] = [];
        
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
            `UPDATE fee_schedules SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`,
            values
        );
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating fee schedule:', error);
        res.status(500).json({ error: 'Failed to update fee schedule' });
    }
});

// Soft delete fee schedule
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const permanent = req.query.permanent === 'true';
        
        if (permanent) {
            await pool.execute('DELETE FROM fee_schedules WHERE id = ?', [id]);
        } else {
            await pool.execute(
                'UPDATE fee_schedules SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
                [id]
            );
        }
        
        res.json({ 
            success: true, 
            message: permanent ? 'Fee schedule permanently deleted' : 'Fee schedule moved to trash' 
        });
    } catch (error) {
        console.error('Error deleting fee schedule:', error);
        res.status(500).json({ error: 'Failed to delete fee schedule' });
    }
});

// Get fee comparison across jurisdictions
router.get('/compare/:stage', authenticateToken, async (req, res) => {
    try {
        const { stage } = req.params;
        const { category = 'OFFICIAL_FEE' } = req.query;
        
        const [rows] = await pool.execute(
            `SELECT fs.jurisdiction, j.name as jurisdiction_name, fs.amount, fs.currency
             FROM fee_schedules fs
             JOIN jurisdictions j ON fs.jurisdiction = j.code
             WHERE fs.stage = ? AND fs.category = ? AND fs.is_active = TRUE
             AND fs.deleted_at IS NULL
             AND (fs.expiry_date IS NULL OR fs.expiry_date >= CURDATE())
             ORDER BY fs.amount ASC`,
            [stage, category]
        ) as [unknown[], unknown[]];
        
        res.json({
            stage,
            category,
            comparisons: rows
        });
    } catch (error) {
        console.error('Error comparing fees:', error);
        res.status(500).json({ error: 'Failed to compare fees' });
    }
});

export default router;
