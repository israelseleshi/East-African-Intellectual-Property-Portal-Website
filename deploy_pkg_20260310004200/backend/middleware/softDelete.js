import { pool } from '../database/db.js';
/**
 * Soft Delete Middleware
 *
 * This middleware intercepts DELETE requests and converts them to soft deletes
 * by setting deleted_at = NOW() instead of actually deleting the record.
 *
 * For tables without soft delete support, it allows hard delete.
 */
// Tables that support soft delete
const SOFT_DELETE_TABLES = [
    'users',
    'clients',
    'trademark_cases',
    'case_history',
    'deadlines',
    'invoices',
    'invoice_items',
    'nice_class_mappings',
    'mark_assets'
];
/**
 * Middleware to handle soft deletes
 * Expects route pattern: DELETE /api/:resource/:id
 * Or with permanent flag: DELETE /api/:resource/:id?permanent=true
 */
export const softDeleteMiddleware = async (req, res, next) => {
    // Only intercept DELETE requests
    if (req.method !== 'DELETE') {
        return next();
    }
    const permanent = req.query.permanent === 'true';
    const tableName = extractTableName(req.path);
    // If permanent delete requested or table doesn't support soft delete, proceed with hard delete
    if (permanent || !tableName || !SOFT_DELETE_TABLES.includes(tableName)) {
        return next();
    }
    // Extract ID from URL
    const id = extractId(req.path);
    if (!id) {
        return next();
    }
    try {
        // Perform soft delete
        const [result] = await pool.execute(`UPDATE ${tableName} SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Record not found or already deleted' });
        }
        res.json({ success: true, message: 'Record moved to trash' });
    }
    catch (error) {
        console.error('Soft delete error:', error);
        res.status(500).json({ error: 'Failed to delete record' });
    }
};
/**
 * Helper to extract table name from API path
 * Example: /api/clients/123 -> clients
 */
function extractTableName(path) {
    const parts = path.split('/').filter(p => p);
    // Expected pattern: api, resource, id
    if (parts.length >= 2 && parts[0] === 'api') {
        return parts[1];
    }
    return null;
}
/**
 * Helper to extract ID from API path
 * Example: /api/clients/123 -> 123
 */
function extractId(path) {
    const parts = path.split('/').filter(p => p);
    if (parts.length >= 3) {
        return parts[2];
    }
    return null;
}
/**
 * Build WHERE clause that excludes deleted records
 * Usage: addSoftDeleteFilter('WHERE status = ?') -> 'WHERE deleted_at IS NULL AND status = ?'
 */
export const addSoftDeleteFilter = (whereClause) => {
    if (whereClause.trim().toUpperCase().startsWith('WHERE')) {
        return whereClause.replace(/WHERE/i, 'WHERE deleted_at IS NULL AND');
    }
    return `deleted_at IS NULL ${whereClause ? 'AND ' + whereClause : ''}`;
};
/**
 * Standard SELECT query builder with soft delete filter
 */
export const buildActiveQuery = (tableName, columns = '*', whereClause = '') => {
    const baseQuery = `SELECT ${columns} FROM ${tableName}`;
    if (whereClause) {
        return `${baseQuery} WHERE deleted_at IS NULL AND ${whereClause}`;
    }
    return `${baseQuery} WHERE deleted_at IS NULL`;
};
