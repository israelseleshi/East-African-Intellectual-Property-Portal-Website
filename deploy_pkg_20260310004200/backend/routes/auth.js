import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';
import { JWT_SECRET } from '../utils/constants.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { logRouteError, sendApiError } from '../utils/apiError.js';
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1)
});
const registerSchema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    firmName: z.string().optional(),
    password: z.string().min(6)
});
const verifyOtpSchema = z.object({
    email: z.string().email(),
    otp: z.string().min(4)
});
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
        const user = rows[0];
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
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '12h' });
        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        logRouteError(req, 'auth.login', error);
        sendApiError(req, res, 500, {
            code: 'AUTHENTICATION_FAILED',
            message: 'Authentication failed'
        });
    }
});
router.get('/me', authenticateToken, (req, res) => {
    res.json(req.user);
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
        const { fullName, email, phone, firmName, password } = parsed.data;
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return sendApiError(req, res, 400, {
                code: 'EMAIL_ALREADY_REGISTERED',
                message: 'Email already registered'
            });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const userId = crypto.randomUUID();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.execute('INSERT INTO users (id, full_name, email, phone, firm_name, password_hash, role, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [userId, fullName, email, phone || null, firmName || null, passwordHash, 'LAWYER', otp]);
        await sendVerificationEmail(email, otp);
        res.status(201).json({ message: 'Account created successfully', userId, email });
    }
    catch (error) {
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
        const [rows] = await pool.execute('SELECT id, full_name, email, role FROM users WHERE email = ? AND verification_code = ?', [email, otp]);
        const user = rows[0];
        if (!user) {
            return sendApiError(req, res, 400, {
                code: 'INVALID_VERIFICATION_CODE',
                message: 'Invalid verification code'
            });
        }
        await pool.execute('UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?', [user.id]);
        await sendWelcomeEmail(user.email, user.full_name);
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.full_name }, JWT_SECRET, { expiresIn: '12h' });
        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        logRouteError(req, 'auth.verifyOtp', error);
        sendApiError(req, res, 500, {
            code: 'VERIFICATION_FAILED',
            message: 'Verification failed'
        });
    }
});
export default router;
