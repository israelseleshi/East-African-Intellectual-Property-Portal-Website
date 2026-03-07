import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadDir } from './utils/constants.js';

// Import Routes
import authRoutes from './routes/auth.js';
import caseRoutes from './routes/cases.js';
import clientRoutes from './routes/clients.js';
import deadlineRoutes from './routes/deadlines.js';
import financialRoutes from './routes/financials.js';
import documentRoutes from './routes/documents.js';
import systemRoutes from './routes/system.js';
import jurisdictionRoutes from './routes/jurisdictions.js';
import notesRoutes from './routes/notes.js';
import oppositionsRoutes from './routes/oppositions.js';
import feesRoutes from './routes/fees.js';
import formsRoutes from './routes/forms.js';
import { pool } from './database/db.js';

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
    'http://localhost:5174',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(uploadDir));

// Serve Mark Images and PDFs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FORMS_UPLOAD_DIR = path.resolve(__dirname, '../../forms-upload');
app.use('/forms-download', express.static(FORMS_UPLOAD_DIR));

// Route Registration
const registerRoutes = (prefix: string = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/cases`, caseRoutes);
  app.use(`${prefix}/clients`, clientRoutes);
  app.use(`${prefix}/deadlines`, deadlineRoutes);
  // Support both /financials and /invoicing if used interchangeably
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
  app.use(`${prefix}/forms`, formsRoutes);
};

// Register routes at both root and /api
// This is critical for cPanel Passenger which sometimes strips or keeps the /api prefix
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
  } catch (error: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;
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
