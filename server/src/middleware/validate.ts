import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { sendApiError } from '../utils/apiError.js';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

const parseOrFail = (
  req: Request,
  res: Response,
  schema: ZodSchema,
  value: unknown,
  code: string,
  message: string
) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    sendApiError(req, res, 400, {
      code,
      message,
      details: parsed.error.flatten()
    });
    return null;
  }
  return parsed.data;
};

export const validateRequest = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.params) {
      const parsedParams = parseOrFail(req, res, schemas.params, req.params, 'INVALID_PARAMS', 'Invalid route parameters');
      if (!parsedParams) return;
      req.params = parsedParams as Request['params'];
    }

    if (schemas.query) {
      const parsedQuery = parseOrFail(req, res, schemas.query, req.query, 'INVALID_QUERY', 'Invalid query parameters');
      if (!parsedQuery) return;
      req.query = parsedQuery as Request['query'];
    }

    if (schemas.body) {
      const parsedBody = parseOrFail(req, res, schemas.body, req.body, 'INVALID_BODY', 'Invalid request body');
      if (!parsedBody) return;
      req.body = parsedBody;
    }

    next();
  };
};
