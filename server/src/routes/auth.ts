import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { JWT_SECRET } from '../utils/constants.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetOtp } from '../utils/mailer.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  phone?: string;
  firm_name?: string;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const registerSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  firmName: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional()
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4)
});

const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  firmName: z.string().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const ACCESS_TTL = '7d';
const REFRESH_DAYS = 30;
const isProd = process.env.NODE_ENV === 'production';

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const signAccess = (user: User) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL }
  );

const signRefresh = (user: User, jti: string) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.full_name, jti, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: `${REFRESH_DAYS}d` }
  );

const setAuthCookies = (res: express.Response, accessToken: string, refreshToken: string) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api'
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/api/auth'
  });
};

const clearAuthCookies = (res: express.Response) => {
  res.clearCookie(ACCESS_COOKIE, { path: '/api' });
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
};

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_LOGIN_PAYLOAD',
        message: 'Invalid login payload',
        details: parsed.error.flatten()
      });
    }

    const { email, password } = parsed.data;
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    const user = (rows as User[])[0];

    if (!user) {
      return sendApiError(req, res, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    if (!user.is_verified) {
      return sendApiError(req, res, 403, {
        code: 'ACCOUNT_NOT_VERIFIED',
        message: 'Account not verified. Please verify your email.',
        details: {
          unverified: true,
          email: user.email
        }
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return sendApiError(req, res, 401, {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    const jti = crypto.randomUUID();
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user, jti);

    await pool.execute(
      'INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
      [jti, user.id, hashToken(refreshToken), REFRESH_DAYS]
    );

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        firm_name: user.firm_name
      }
    });
  } catch (error) {
    logRouteError(req, 'auth.login', error);
    sendApiError(req, res, 500, {
      code: 'AUTHENTICATION_FAILED',
      message: 'Authentication failed'
    });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, role, phone, firm_name FROM users WHERE id = ?',
      [req.user!.id]
    );
    const user = (rows as User[])[0];
    if (!user) {
      return sendApiError(req, res, 404, {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }
    res.json(user);
  } catch (error) {
    logRouteError(req, 'auth.me', error);
    return sendApiError(req, res, 500, {
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch user data'
    });
  }
});

router.patch('/profile', authenticateToken, async (req, res) => {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_PROFILE_PAYLOAD',
        message: 'Invalid profile payload',
        details: parsed.error.flatten()
      });
    }

    const { fullName, phone, firmName } = parsed.data;
    const updates: string[] = [];
    const params: any[] = [];

    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone);
    }
    if (firmName !== undefined) {
      updates.push('firm_name = ?');
      params.push(firmName);
    }

    if (updates.length === 0) {
      return res.json({ message: 'No changes provided' });
    }

    params.push(req.user!.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    logRouteError(req, 'auth.updateProfile', error);
    sendApiError(req, res, 500, { code: 'PROFILE_UPDATE_FAILED', message: 'Failed to update profile' });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_PASSWORD_PAYLOAD',
        message: 'Invalid password payload',
        details: parsed.error.flatten()
      });
    }

    const { currentPassword, newPassword } = parsed.data;
    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
    const user = (rows as Array<{ password_hash: string }>)[0];

    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return sendApiError(req, res, 400, { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user!.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logRouteError(req, 'auth.changePassword', error);
    sendApiError(req, res, 500, { code: 'PASSWORD_CHANGE_FAILED', message: 'Failed to change password' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_REGISTER_PAYLOAD',
        message: 'Invalid registration payload',
        details: parsed.error.flatten()
      });
    }

    const { fullName, email, phone, firmName, password, role } = parsed.data;

    const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if ((existingUsers as unknown[]).length > 0) {
      return sendApiError(req, res, 400, {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email already registered'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = crypto.randomUUID();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const normalizedRole = role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';

    await pool.execute(
      'INSERT INTO users (id, full_name, email, phone, firm_name, password_hash, role, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, fullName, email, phone || null, firmName || null, passwordHash, normalizedRole, otp]
    );

    await sendVerificationEmail(email, otp);

    res.status(201).json({ message: 'Account created successfully', userId, email });
  } catch (error) {
    logRouteError(req, 'auth.register', error);
    sendApiError(req, res, 500, {
      code: 'REGISTRATION_FAILED',
      message: 'Registration failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_OTP_PAYLOAD',
        message: 'Invalid verification payload',
        details: parsed.error.flatten()
      });
    }

    const { email, otp } = parsed.data;
    const [rows] = await pool.execute(
      'SELECT id, full_name, email, role FROM users WHERE email = ? AND verification_code = ?',
      [email, otp]
    );
    const user = (rows as User[])[0];

    if (!user) {
      return sendApiError(req, res, 400, {
        code: 'INVALID_VERIFICATION_CODE',
        message: 'Invalid verification code'
      });
    }

    await pool.execute(
      'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
      [user.id]
    );

    await sendWelcomeEmail(user.email, user.full_name);

    const jti = crypto.randomUUID();
    const accessToken = signAccess(user as User);
    const refreshToken = signRefresh(user as User, jti);
    await pool.execute(
      'INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
      [jti, user.id, hashToken(refreshToken), REFRESH_DAYS]
    );
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        firm_name: user.firm_name
      }
    });
  } catch (error) {
    logRouteError(req, 'auth.verifyOtp', error);
    sendApiError(req, res, 500, {
      code: 'VERIFICATION_FAILED',
      message: 'Verification failed'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) {
      return sendApiError(req, res, 401, { code: 'REFRESH_TOKEN_MISSING', message: 'Refresh token missing' });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload;
    if (!decoded?.id || decoded.type !== 'refresh' || !decoded.jti) {
      return sendApiError(req, res, 401, { code: 'REFRESH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    const [rows] = await pool.execute(
      'SELECT user_id, revoked_at, expires_at FROM user_refresh_tokens WHERE id = ? AND token_hash = ?',
      [decoded.jti, hashToken(refreshToken)]
    );
    const row = (rows as Array<{ user_id: string; revoked_at: Date | null; expires_at: Date }>)[0];
    if (!row || row.revoked_at) {
      return sendApiError(req, res, 401, { code: 'REFRESH_TOKEN_REVOKED', message: 'Refresh token revoked' });
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return sendApiError(req, res, 401, { code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token expired' });
    }

    await pool.execute('UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE id = ?', [decoded.jti]);

    const [userRows] = await pool.execute(
      'SELECT id, full_name, email, role, password_hash, is_verified, is_active FROM users WHERE id = ?',
      [decoded.id]
    );
    const user = (userRows as User[])[0];
    if (!user) {
      clearAuthCookies(res);
      return sendApiError(req, res, 401, { code: 'USER_NOT_FOUND', message: 'User no longer exists' });
    }

    const newJti = crypto.randomUUID();
    const newAccess = signAccess(user);
    const newRefresh = signRefresh(user, newJti);
    await pool.execute(
      'INSERT INTO user_refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
      [newJti, user.id, hashToken(newRefresh), REFRESH_DAYS]
    );
    setAuthCookies(res, newAccess, newRefresh);
    res.json({
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        firm_name: user.firm_name
      }
    });
  } catch (error) {
    logRouteError(req, 'auth.refresh', error);
    clearAuthCookies(res);
    return sendApiError(req, res, 401, { code: 'REFRESH_FAILED', message: 'Token refresh failed' });
  }
});

router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload;
        if (decoded?.jti) {
          await pool.execute('UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE id = ?', [decoded.jti]);
        }
      } catch (err) {
        logger.warn('logout-refresh-invalid', { err });
      }
    }
    if (userId) {
      await pool.execute('UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [userId]);
    }
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (error) {
    logRouteError(req, 'auth.logout', error);
    sendApiError(req, res, 500, { code: 'LOGOUT_FAILED', message: 'Logout failed' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendApiError(req, res, 400, { code: 'EMAIL_REQUIRED', message: 'Email is required' });
    }

    const [rows] = await pool.execute('SELECT id, full_name, email FROM users WHERE email = ? AND is_active = 1', [email]);
    const user = (rows as User[])[0];

    if (!user) {
      return res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenHash = crypto.createHash('sha256').update(resetOtp).digest('hex');
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    await pool.execute(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires_at = ? WHERE id = ?',
      [resetTokenHash, expiresAt, user.id]
    );

    const emailSent = await sendPasswordResetOtp(user.email, user.full_name, resetOtp);
    
    if (!emailSent) {
      return sendApiError(req, res, 500, { 
        code: 'EMAIL_SEND_FAILED', 
        message: 'Failed to send reset code. Please try again later.' 
      });
    }

    res.json({ message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    console.error('FORGOT_PASSWORD_ERROR_DEBUG:', error);
    logRouteError(req, 'auth.forgot-password', error);
    sendApiError(req, res, 500, { 
      code: 'FORGOT_PASSWORD_FAILED', 
      message: 'Failed to process forgot password request',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return sendApiError(req, res, 400, { code: 'MISSING_FIELDS', message: 'Email, OTP, and password are required' });
    }

    const tokenHash = crypto.createHash('sha256').update(otp).digest('hex');
    const [rows] = await pool.execute(
      'SELECT id FROM users WHERE email = ? AND reset_token_hash = ? AND reset_token_expires_at > NOW() AND is_active = 1',
      [email, tokenHash]
    );
    const user = (rows as User[])[0];

    if (!user) {
      return sendApiError(req, res, 400, { code: 'INVALID_OR_EXPIRED_OTP', message: 'Invalid or expired reset code' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires_at = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    logRouteError(req, 'auth.reset-password', error);
    sendApiError(req, res, 500, { code: 'RESET_PASSWORD_FAILED', message: 'Failed to reset password' });
  }
});

export default router;
