import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const attachRequestContext = (req: Request, res: Response, next: NextFunction) => {
  const incomingRequestId = req.header('x-request-id');
  const requestId = incomingRequestId && incomingRequestId.trim().length > 0
    ? incomingRequestId.trim()
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  next();
};
