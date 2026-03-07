import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../utils/mailer.js';
import { JWT_SECRET } from '../utils/constants.js';
import { authenticateToken } from '../middleware/auth.js';

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
    verification_code?: string;
    last_login?: Date;
}

const router = express.Router();

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
        const user = (rows as User[])[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.is_verified) {
            return res.status(403).json({
                error: 'Account not verified. Please verify your email.',
                unverified: true,
                email: user.email
            });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Update last login
        await pool.execute('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.full_name },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.get('/me', authenticateToken, (req: any, res) => {
    res.json(req.user);
});

router.post('/register', async (req, res) => {
    try {
        const { fullName, email, phone, firmName, password } = req.body;
        console.log('Register attempt for:', email);

        // Check if user already exists
        const [existingUsers] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        if ((existingUsers as unknown[]).length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userId = crypto.randomUUID();
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await pool.execute(
            'INSERT INTO users (id, full_name, email, phone, firm_name, password_hash, role, verification_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, fullName, email, phone || null, firmName || null, passwordHash, 'LAWYER', otp]
        );

        // Send verification email
        await sendVerificationEmail(email, otp);

        res.status(201).json({ message: 'Account created successfully', userId, email });
    } catch (error: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = error as any;
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: err.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const [rows] = await pool.execute(
            'SELECT id, full_name, email, role FROM users WHERE email = ? AND verification_code = ?',
            [email, otp]
        );
        const user = (rows as User[])[0];

        if (!user) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Update user as verified
        await pool.execute(
            'UPDATE users SET is_verified = 1, verification_code = NULL WHERE id = ?',
            [user.id]
        );

        // Send welcome email
        await sendWelcomeEmail(user.email, user.full_name);

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.full_name },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

export default router;
