import type { NextFunction, Request, Response } from 'express';
import { sendApiError } from '../utils/apiError.js';
import { isHttpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

export const notFoundHandler = (req: Request, res: Response) => {
  return sendApiError(req, res, 404, {
    code: 'ROUTE_NOT_FOUND',
    message: 'The requested endpoint was not found'
  });
};

export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (isHttpError(error)) {
    logger.warn(`[${req.requestId}] handled-http-error`, {
      code: error.code,
      status: error.status,
      details: error.details
    });
    sendApiError(req, res, error.status, {
      code: error.code,
      message: error.message,
      details: error.details
    });
    return;
  }

  logger.error(`[${req.requestId}] unhandled-error`, {
    error: error instanceof Error ? error.message : String(error)
  });
  sendApiError(req, res, 500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error'
  });
};
