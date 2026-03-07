import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { uploadDir } from './dist/utils/constants.js';

// Import Routes from dist
import authRoutes from './dist/routes/auth.js';
import caseRoutes from './dist/routes/cases.js';
import clientRoutes from './dist/routes/clients.js';
import deadlineRoutes from './dist/routes/deadlines.js';
import financialRoutes from './dist/routes/financials.js';
import documentRoutes from './dist/routes/documents.js';
import systemRoutes from './dist/routes/system.js';
import jurisdictionRoutes from './dist/routes/jurisdictions.js';
import notesRoutes from './dist/routes/notes.js';
import oppositionsRoutes from './dist/routes/oppositions.js';
import feesRoutes from './dist/routes/fees.js';
import notificationsRoutes from './dist/routes/notifications.js';
import { pool } from './dist/database/db.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://eastafricanip.com',
    'https://www.eastafricanip.com',
    'http://eastafricanip.com',
    'http://www.eastafricanip.com',
    'http://localhost:5173',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Route Registration
const registerRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/cases`, caseRoutes);
  app.use(`${prefix}/clients`, clientRoutes);
  app.use(`${prefix}/deadlines`, deadlineRoutes);
  app.use(`${prefix}/financials`, financialRoutes);
  app.use(`${prefix}/invoicing`, financialRoutes);
  app.use(`${prefix}/documents`, documentRoutes);
  app.use(`${prefix}/upload`, documentRoutes);
  app.use(`${prefix}/system`, systemRoutes);
  app.use(`${prefix}/dashboard`, systemRoutes);
  app.use(`${prefix}/health`, systemRoutes);
  app.use(`${prefix}/jurisdictions`, jurisdictionRoutes);
  app.use(`${prefix}/notes`, notesRoutes);
  app.use(`${prefix}/oppositions`, oppositionsRoutes);
  app.use(`${prefix}/fees`, feesRoutes);
  app.use(`${prefix}/notifications`, notificationsRoutes);
};

registerRoutes('');
registerRoutes('/api');

// Health check fallback
app.get('/health', (req, res) => {
  res.json({ status: 'OK', environment: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    prefix: '/api', 
    environment: process.env.NODE_ENV, 
    db_host: process.env.DB_HOST,
    db_name: process.env.DB_NAME,
    timestamp: new Date().toISOString() 
  });
});

app.get('/api/db-check', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as connected');
    res.json({ status: 'Database Connected', data: rows });
  } catch (error) {
    const err = error;
    res.status(500).json({
      status: 'Database Error',
      message: err.message,
      code: err.code,
      details: 'Check your cPanel environment variables and MySQL user privileges.'
    });
  }
});

app.listen(port, () => {
  console.log(`TPMS API running on port ${port}`);
  console.log(`Uploads directory: ${uploadDir}`);
});
