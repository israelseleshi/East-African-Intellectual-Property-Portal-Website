import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

const CSRF_COOKIE_NAME = 'csrf_token';
const IGNORE_PATHS = ['/auth/login', '/auth/refresh'];
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

const makeToken = () => crypto.randomBytes(24).toString('hex');

export const csrfTokenSetter = (req: Request, res: Response, next: NextFunction) => {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (!existing) {
    const token = makeToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      sameSite: 'lax',
      httpOnly: false,
      secure: isProd,
      path: '/'
    });
  }
  next();
};

export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (SAFE_METHODS.includes(req.method)) return next();
  const path = req.path.toLowerCase();
  if (IGNORE_PATHS.some((p) => path.endsWith(p))) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.header('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      code: 'CSRF_MISMATCH',
      message: 'Invalid CSRF token'
    });
  }

  return next();
};
const isProd = process.env.NODE_ENV === 'production';
