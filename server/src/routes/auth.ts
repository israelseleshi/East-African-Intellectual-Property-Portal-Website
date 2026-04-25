import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth.js';
import { JWT_SECRET } from '../utils/constants.js';
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetOtp, sendApprovalEmail, sendRejectionEmail } from '../utils/mailer.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
import { generateTotpSecret, generateTotpUri, verifyTotpCode, generateBackupCodes, validateBackupCode } from '../utils/totp.js';

interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role: string;
  is_verified: boolean;
  is_approved: boolean;
  is_active: boolean;
  rejection_count: number;
  phone?: string;
  firm_name?: string;
  created_at?: Date;
  totp_secret?: string;
  totp_enabled?: number;
  backup_codes?: string;
}

type DbLikeError = {
  code?: string;
  errno?: number;
  message?: string;
};

const isDbConnectivityError = (error: unknown): error is DbLikeError => {
  if (!error || typeof error !== 'object') return false;
  const code = (error as DbLikeError).code;
  return [
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'PROTOCOL_CONNECTION_LOST',
    'ER_ACCESS_DENIED_ERROR',
    'ER_BAD_DB_ERROR',
    'ER_NO_SUCH_TABLE'
  ].includes(code || '');
};

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

    if (!user.is_approved) {
      return sendApiError(req, res, 403, {
        code: 'ACCOUNT_PENDING_APPROVAL',
        message: 'Your account is pending approval from super administrator.',
        details: {
          rejection_count: user.rejection_count || 0,
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

    // Check if 2FA is enabled
    if (user.totp_enabled) {
      return res.status(200).json({
        requires2FA: true,
        userId: user.id,
        message: 'Please enter your 2FA code'
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
    if (isDbConnectivityError(error)) {
      return sendApiError(req, res, 503, {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database connection failed. Please verify DB host, firewall, and credentials.',
        details: process.env.NODE_ENV !== 'production'
          ? {
            code: error.code,
            message: error.message,
            errno: error.errno
          }
          : undefined
      });
    }
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
    const isApproved = normalizedRole === 'SUPER_ADMIN' ? 1 : 0;

    await pool.execute(
      'INSERT INTO users (id, full_name, email, phone, firm_name, password_hash, role, verification_code, is_active, is_verified, is_approved, rejection_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, 0)',
      [userId, fullName, email, phone || null, firmName || null, passwordHash, normalizedRole, otp, isApproved]
    );

    await sendVerificationEmail(email, otp);

    if (normalizedRole === 'SUPER_ADMIN') {
      res.status(201).json({ message: 'Account created and activated. You can now login.', userId, email });
    } else {
      res.status(201).json({ message: 'Account created successfully. Awaiting approval from super administrator.', userId, email });
    }
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

router.get('/pending', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, phone, firm_name, created_at, is_approved, rejection_count 
       FROM users 
       WHERE role = 'ADMIN' AND is_verified = 1 AND is_active = 1 
       ORDER BY rejection_count DESC, created_at DESC`
    );
    res.json({ admins: rows });
  } catch (error) {
    logRouteError(req, 'auth.pending', error);
    sendApiError(req, res, 500, { code: 'FETCH_PENDING_FAILED', message: 'Failed to fetch pending administrators' });
  }
});

router.patch('/approve/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [existing] = await pool.execute(
      'SELECT id, full_name, email FROM users WHERE id = ? AND role = ? AND is_active = 1',
      [userId, 'ADMIN']
    );
    const user = (existing as User[])[0];

    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'Administrator not found' });
    }

    await pool.execute(
      'UPDATE users SET is_approved = 1 WHERE id = ?',
      [userId]
    );

    await sendApprovalEmail(user.email, user.full_name);

    res.json({ message: 'Administrator approved successfully' });
  } catch (error) {
    logRouteError(req, 'auth.approve', error);
    sendApiError(req, res, 500, { code: 'APPROVE_FAILED', message: 'Failed to approve administrator' });
  }
});

router.patch('/reject/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [existing] = await pool.execute(
      'SELECT id, full_name, email, rejection_count FROM users WHERE id = ? AND role = ?',
      [userId, 'ADMIN']
    );
    const user = (existing as User[])[0];

    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'Administrator not found' });
    }

    const currentCount = user.rejection_count || 0;
    if (currentCount >= 3) {
      await pool.execute(
        'UPDATE users SET is_active = 0, rejection_count = rejection_count + 1 WHERE id = ?',
        [userId]
      );
    } else {
      await pool.execute(
        'UPDATE users SET is_approved = 0, rejection_count = rejection_count + 1, verification_code = NULL WHERE id = ?',
        [userId]
      );
    }

    await sendRejectionEmail(user.email, user.full_name, 3 - currentCount - 1);

    res.json({ message: 'Administrator rejected', remaining_attempts: 3 - currentCount - 1 });
  } catch (error) {
    logRouteError(req, 'auth.reject', error);
    sendApiError(req, res, 500, { code: 'REJECT_FAILED', message: 'Failed to reject administrator' });
  }
});

// TOTP 2FA Routes
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendApiError(req, res, 401, { code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }

    const [rows] = await pool.execute('SELECT email, full_name, totp_enabled FROM users WHERE id = ?', [userId]);
    const user = (rows as User[])[0];
    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (user.totp_enabled) {
      return sendApiError(req, res, 400, { code: '2FA_ALREADY_ENABLED', message: '2FA is already enabled' });
    }

    const secret = generateTotpSecret();
    const totpUri = generateTotpUri(secret, user.email);

    await pool.execute(
      'UPDATE users SET totp_secret = ? WHERE id = ?',
      [secret, userId]
    );

    res.json({ 
      secret, 
      totpUri,
      message: 'TOTP secret generated. Scan QR code with Google Authenticator.' 
    });
  } catch (error) {
    logRouteError(req, 'auth.2fa.setup', error);
    sendApiError(req, res, 500, { code: '2FA_SETUP_FAILED', message: 'Failed to setup 2FA' });
  }
});

router.post('/2fa/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code } = req.body;
    
    if (!code || code.length !== 6) {
      return sendApiError(req, res, 400, { code: 'INVALID_CODE', message: 'Please enter a 6-digit code' });
    }

    const [rows] = await pool.execute('SELECT totp_secret, backup_codes FROM users WHERE id = ?', [userId]);
    const user = (rows as User[])[0];
    if (!user || !user.totp_secret) {
      return sendApiError(req, res, 400, { code: '2FA_NOT_SETUP', message: 'Please setup 2FA first' });
    }

    const isValid = verifyTotpCode(user.totp_secret, code);
    if (!isValid) {
      return sendApiError(req, res, 400, { code: 'INVALID_CODE', message: 'Invalid verification code' });
    }

    const backupCodes = generateBackupCodes(10);

    await pool.execute(
      'UPDATE users SET totp_enabled = 1, totp_verified_at = NOW(), backup_codes = ? WHERE id = ?',
      [JSON.stringify(backupCodes), userId]
    );

    res.json({ 
      message: '2FA enabled successfully',
      backupCodes 
    });
  } catch (error) {
    logRouteError(req, 'auth.2fa.verify', error);
    sendApiError(req, res, 500, { code: '2FA_VERIFY_FAILED', message: 'Failed to enable 2FA' });
  }
});

router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code } = req.body;
    
    if (!code || code.length !== 6) {
      return sendApiError(req, res, 400, { code: 'INVALID_CODE', message: 'Please enter a 6-digit code or backup code' });
    }

    const [rows] = await pool.execute('SELECT totp_secret, backup_codes FROM users WHERE id = ?', [userId]);
    const user = (rows as User[])[0];
    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    let isValid = false;

    // Try TOTP code first
    if (user.totp_secret) {
      isValid = verifyTotpCode(user.totp_secret, code);
    }

    // If not valid, try backup codes
    if (!isValid && user.backup_codes) {
      const backupCodes = JSON.parse(user.backup_codes);
      const result = validateBackupCode(backupCodes, code);
      if (result.valid) {
        isValid = true;
        await pool.execute(
          'UPDATE users SET backup_codes = ? WHERE id = ?',
          [JSON.stringify(result.remainingCodes), userId]
        );
      }
    }

    if (!isValid) {
      return sendApiError(req, res, 400, { code: 'INVALID_CODE', message: 'Invalid code' });
    }

    await pool.execute(
      'UPDATE users SET totp_enabled = 0, totp_secret = NULL, totp_verified_at = NULL, backup_codes = NULL WHERE id = ?',
      [userId]
    );

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logRouteError(req, 'auth.2fa.disable', error);
    sendApiError(req, res, 500, { code: '2FA_DISABLE_FAILED', message: 'Failed to disable 2FA' });
  }
});

router.post('/2fa/verify-login', async (req, res) => {
  try {
    const { userId, code } = req.body;
    
    if (!userId || !code) {
      return sendApiError(req, res, 400, { code: 'MISSING_FIELDS', message: 'User ID and code are required' });
    }

    const [rows] = await pool.execute('SELECT totp_secret, backup_codes FROM users WHERE id = ? AND is_active = 1', [userId]);
    const user = (rows as User[])[0];
    if (!user) {
      return sendApiError(req, res, 404, { code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    let isValid = false;
    let usedBackupCode = false;

    // Try TOTP code first
    if (user.totp_secret) {
      isValid = verifyTotpCode(user.totp_secret, code);
    }

    // If not valid, try backup codes
    if (!isValid && user.backup_codes) {
      const backupCodes = JSON.parse(user.backup_codes);
      const result = validateBackupCode(backupCodes, code);
      if (result.valid) {
        isValid = true;
        usedBackupCode = true;
        await pool.execute(
          'UPDATE users SET backup_codes = ? WHERE id = ?',
          [JSON.stringify(result.remainingCodes), userId]
        );
      }
    }

    if (!isValid) {
      return sendApiError(req, res, 400, { code: 'INVALID_CODE', message: 'Invalid verification code' });
    }

    // Generate tokens after successful 2FA
    const [userRows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
    const userData = (userRows as User[])[0];

    await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);

    const jti = crypto.randomUUID();
    const accessToken = signAccess(userData);
    const refreshToken = signRefresh(userData, jti);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: userData.id,
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        firm_name: userData.firm_name
      }
    });
  } catch (error) {
    logRouteError(req, 'auth.2fa.verify-login', error);
    sendApiError(req, res, 500, { code: '2FA_VERIFY_FAILED', message: 'Verification failed' });
  }
});

router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const [rows] = await pool.execute('SELECT totp_enabled, totp_verified_at FROM users WHERE id = ?', [userId]);
    const user = (rows as User[])[0];
    
    res.json({ 
      totp_enabled: user?.totp_enabled || false,
      totp_verified_at: user?.totp_verified_at
    });
  } catch (error) {
    logRouteError(req, 'auth.2fa.status', error);
    sendApiError(req, res, 500, { code: '2FA_STATUS_FAILED', message: 'Failed to get 2FA status' });
  }
});

router.get('/2fa/backup-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    const [rows] = await pool.execute('SELECT backup_codes FROM users WHERE id = ?', [userId]);
    const user = (rows as User[])[0];
    
    if (!user?.backup_codes) {
      return sendApiError(req, res, 404, { code: 'NO_BACKUP_CODES', message: 'No backup codes found. Please enable 2FA first.' });
    }
    
    res.json({ backupCodes: JSON.parse(user.backup_codes) });
  } catch (error) {
    logRouteError(req, 'auth.2fa.backup-codes', error);
    sendApiError(req, res, 500, { code: 'BACKUP_CODES_FAILED', message: 'Failed to get backup codes' });
  }
});

export default router;
