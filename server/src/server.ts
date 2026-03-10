import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadDir } from './utils/constants.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

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
import { ensureAuthTables, pool } from './database/db.js';
import { attachRequestContext } from './middleware/requestContext.js';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { csrfMiddleware, csrfTokenSetter } from './middleware/csrf.js';

const app = express();
const port = process.env.PORT || 3001;

const nativeConsoleError = console.error.bind(console);
const nativeConsoleWarn = console.warn.bind(console);
console.error = (...args: unknown[]) => {
  logger.error('console-error', { args });
  nativeConsoleError(...args);
};
console.warn = (...args: unknown[]) => {
  logger.warn('console-warn', { args });
  nativeConsoleWarn(...args);
};

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
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'img-src': ["'self'", 'data:', 'blob:'],
      'connect-src': ["'self'", 'https://eastafricanip.com', 'https://www.eastafricanip.com', 'http://eastafricanip.com', 'http://www.eastafricanip.com', 'http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001']
    }
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cookieParser());
app.use(attachRequestContext);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(csrfTokenSetter);

// Serve uploads from both /uploads and /api/uploads for production compatibility
app.use('/uploads', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));

// Serve Mark Images and PDFs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const formsUploadCandidates = [
  process.env.FORMS_UPLOAD_DIR,
  path.resolve(__dirname, '../forms-upload'),
  path.resolve(__dirname, 'forms-upload'),
  path.resolve(process.cwd(), 'forms-upload'),
  path.resolve(process.cwd(), 'server/forms-upload'),
  path.resolve(process.cwd(), 'server/src/forms-upload'),
].filter((v): v is string => Boolean(v));

const FORMS_UPLOAD_DIR = formsUploadCandidates.find((dir) => fs.existsSync(dir)) || formsUploadCandidates[0];
const MARKS_UPLOAD_DIR = path.resolve(uploadDir, 'marks');
logger.info('boot-forms-upload-dir', { formsUploadDir: FORMS_UPLOAD_DIR });
app.use('/forms-download', express.static(FORMS_UPLOAD_DIR));
app.use('/api/forms-download', express.static(FORMS_UPLOAD_DIR));

const findLocalFormAsset = (filename: string) => {
  const safeName = path.basename(filename);
  const primary = path.resolve(FORMS_UPLOAD_DIR, safeName);
  if (fs.existsSync(primary)) return primary;

  const marksExact = path.resolve(MARKS_UPLOAD_DIR, safeName);
  if (fs.existsSync(marksExact)) return marksExact;

  // Fallback for legacy naming mismatches (e.g. *_<caseid>.png vs *_<timestamp>.png)
  if (fs.existsSync(MARKS_UPLOAD_DIR)) {
    const ext = path.extname(safeName);
    const stem = path.basename(safeName, ext);
    const basePrefix = stem.replace(/_[a-f0-9]{8,}$/i, '');
    const candidates = fs.readdirSync(MARKS_UPLOAD_DIR)
      .filter((name) => name.endsWith(ext) && name.startsWith(`${basePrefix}_`))
      .map((name) => path.resolve(MARKS_UPLOAD_DIR, name))
      .sort((a, b) => {
        const aTime = fs.statSync(a).mtimeMs;
        const bTime = fs.statSync(b).mtimeMs;
        return bTime - aTime;
      });

    if (candidates.length > 0) return candidates[0];
  }

  return null;
};

const formDownloadFallback = (req: express.Request, res: express.Response) => {
  const found = findLocalFormAsset(req.params.filename);
  if (!found) return res.status(404).json({ error: 'Form asset not found' });
  return res.sendFile(found);
};

app.get('/forms-download/:filename', formDownloadFallback);
app.get('/api/forms-download/:filename', formDownloadFallback);

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
app.use(csrfMiddleware);
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

app.use(notFoundHandler);
app.use(globalErrorHandler);

// Ensure critical auth tables exist before accepting requests.
ensureAuthTables().then(() => {
  logger.info('boot-auth-tables-ok');
}).catch((err: unknown) => {
  // If this fails, login/refresh will 500. We log loudly but still start so health endpoints work.
  logger.error('boot-auth-tables-failed', { error: String(err) });
});

app.listen(port, () => {
  logger.info('server-started', {
    port: Number(port),
    uploadsDirectory: uploadDir
  });
});
