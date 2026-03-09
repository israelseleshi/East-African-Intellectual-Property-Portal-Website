import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId && incomingRequestId.trim().length > 0
    ? incomingRequestId.trim()
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Backward-compatible response normalization:
  // if legacy handlers send non-standard error shapes, append requestId and normalize keys.
  const originalJson = res.json.bind(res);
  res.json = ((payload: unknown) => {
    if (res.statusCode >= 400) {
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const body = payload as Record<string, unknown>;
        if (!('requestId' in body)) {
          const normalized: Record<string, unknown> = {
            ...body,
            requestId
          };
          if (!('message' in normalized) && typeof body.error === 'string') {
            normalized.message = body.error;
          }
          if (!('code' in normalized)) {
            normalized.code = 'REQUEST_FAILED';
          }
          if ('error' in normalized) {
            delete normalized.error;
          }
          return originalJson(normalized);
        }
      } else {
        return originalJson({
          code: 'REQUEST_FAILED',
          message: 'Request failed',
          details: payload,
          requestId
        });
      }
    }
    return originalJson(payload);
  }) as Response['json'];

  logger.info('request-start', {
    requestId,
    method: req.method,
    path: req.path
  });
  next();
};
