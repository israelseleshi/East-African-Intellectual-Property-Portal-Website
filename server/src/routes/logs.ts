import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Create logs directory if it doesn't exist
const getLogsDir = () => {
  const logsDir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
};

/**
 * POST /logs/export
 * Receives export logs from client and writes them to log file
 */
router.post('/export', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const { logs, formatted, duration, userAgent, timestamp } = req.body;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid log data: logs must be an array'
      });
    }

    const logsDir = getLogsDir();
    const dateStr = new Date(timestamp).toISOString().split('T')[0];
    const logFilePath = path.join(logsDir, `export-logs-${dateStr}.txt`);

    // Create formatted log entry with metadata
    let logContent = `\n${'='.repeat(80)}\n`;
    logContent += `Export Session Log - ${timestamp}\n`;
    logContent += `Duration: ${duration?.toFixed(2) || 'N/A'}s\n`;
    logContent += `User Agent: ${userAgent || 'N/A'}\n`;
    logContent += `IP Address: ${req.ip || 'N/A'}\n`;
    logContent += `Total Entries: ${logs.length}\n`;
    logContent += `${'='.repeat(80)}\n\n`;

    if (formatted) {
      logContent += formatted;
    } else {
      // Fallback: format logs manually
      for (const entry of logs) {
        logContent += `[${entry.timestamp}] ${entry.level.toUpperCase().padEnd(7)} ${entry.message}\n`;
        if (entry.details && Object.keys(entry.details).length > 0) {
          logContent += `  Details: ${JSON.stringify(entry.details, null, 2)}\n`;
        }
      }
    }

    // Append to log file
    fs.appendFileSync(logFilePath, logContent);

    logger.info('export-logs-saved', {
      filePath: logFilePath,
      entries: logs.length,
      duration,
      hasErrors: logs.some((l: any) => l.level === 'error')
    });

    res.json({
      success: true,
      message: 'Logs saved successfully',
      filePath: logFilePath,
      entries: logs.length
    });
  } catch (err: unknown) {
    const error = err as any;
    logger.error('export-logs-error', {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to save logs',
      error: error.message
    });
  }
});

/**
 * GET /logs/export
 * Retrieve recent export logs (for debugging)
 */
router.get('/export', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const logsDir = getLogsDir();
    const files = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('export-logs-') && f.endsWith('.txt'))
      .sort()
      .reverse();

    const logs = files.map(filename => ({
      filename,
      path: path.join(logsDir, filename),
      created: fs.statSync(path.join(logsDir, filename)).mtime
    }));

    res.json({
      success: true,
      logsDirectory: logsDir,
      logFiles: logs.slice(0, 10) // Return last 10 log files
    });
  } catch (err: unknown) {
    const error = err as any;
    logger.error('export-logs-list-error', {
      message: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve logs',
      error: error.message
    });
  }
});

/**
 * GET /logs/export/:filename
 * Download a specific export log file
 */
router.get('/export/:filename', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const logsDir = getLogsDir();
    const filename = req.params.filename;
    
    // Security: prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }

    const filePath = path.join(logsDir, filename);

    // Verify file exists and is in the logs directory
    const realPath = fs.realpathSync(filePath);
    const realLogsDir = fs.realpathSync(logsDir);
    if (!realPath.startsWith(realLogsDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Log file not found'
      });
    }

    res.download(filePath, filename);
  } catch (err: unknown) {
    const error = err as any;
    logger.error('export-logs-download-error', {
      message: error.message
    });

    res.status(500).json({
      success: false,
      message: 'Failed to download log file',
      error: error.message
    });
  }
});

export default router;
