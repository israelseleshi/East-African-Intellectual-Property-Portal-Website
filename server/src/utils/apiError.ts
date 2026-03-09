import type { Request, Response } from 'express';

interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export const sendApiError = (
  req: Request,
  res: Response,
  status: number,
  payload: ApiErrorPayload
) => {
  return res.status(status).json({
    code: payload.code,
    message: payload.message,
    details: payload.details,
    requestId: req.requestId
  });
};

export const logRouteError = (req: Request, scope: string, error: unknown) => {
  console.error(`[${req.requestId}] ${scope}`, error);
};
