import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from '../utils/apiError.js';

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (userRole !== 'SUPER_ADMIN') {
        return sendApiError(req, res, 403, {
            code: 'FORBIDDEN',
            message: 'Access denied. Super admin privileges required.'
        });
    }
    next();
};