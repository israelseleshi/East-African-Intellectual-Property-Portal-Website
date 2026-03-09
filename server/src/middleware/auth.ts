import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/constants.js';
import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from '../utils/apiError.js';
import { logRouteError } from '../utils/apiError.js';

interface JwtPayload {
    id: string;
    email?: string;
    role?: string;
    name?: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return sendApiError(req, res, 401, {
            code: 'AUTH_TOKEN_REQUIRED',
            message: 'Access denied. No token provided.'
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            logRouteError(req, 'auth.verify', err);
            return sendApiError(req, res, 403, {
                code: 'AUTH_TOKEN_INVALID',
                message: 'Invalid or expired token.'
            });
        }
        req.user = user as JwtPayload;
        next();
    });
};
