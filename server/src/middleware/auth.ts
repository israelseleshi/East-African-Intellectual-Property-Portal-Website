import jwt from 'jsonwebtoken';
import type { JwtPayload as JwtPayloadBase, VerifyErrors } from 'jsonwebtoken';
import { JWT_SECRET } from '../utils/constants.js';
import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from '../utils/apiError.js';
import { logRouteError } from '../utils/apiError.js';

interface AuthTokenPayload extends JwtPayloadBase {
    id: string;
    email?: string;
    role?: string;
    name?: string;
    jti?: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const cookieToken = req.cookies?.access_token;
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const customToken = req.headers['x-access-token'] as string;
    const token = cookieToken || bearerToken || customToken;

    if (!token) {
        return sendApiError(req, res, 401, {
            code: 'AUTH_TOKEN_REQUIRED',
            message: 'Access denied. No token provided.'
        });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err: VerifyErrors | null, user: string | JwtPayloadBase | undefined) => {
        if (err) {
            logRouteError(req, 'auth.verify', err);
            return sendApiError(req, res, 403, {
                code: 'AUTH_TOKEN_INVALID',
                message: 'Invalid or expired token.'
            });
        }

        // jsonwebtoken can return a string depending on how the token was signed.
        if (!user || typeof user === 'string') {
            return sendApiError(req, res, 403, {
                code: 'AUTH_TOKEN_INVALID',
                message: 'Invalid token payload.'
            });
        }

        const decoded = user as AuthTokenPayload;
        if (!decoded.id) {
            return sendApiError(req, res, 403, {
                code: 'AUTH_TOKEN_INVALID',
                message: 'Token is missing user id.'
            });
        }

        // Keep only what the app expects to be on req.user (see src/types/express.d.ts).
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
        };
        next();
    });
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'SUPER_ADMIN') {
        return sendApiError(req, res, 403, {
            code: 'FORBIDDEN',
            message: 'Access denied. Super admin access required.'
        });
    }
    next();
};
