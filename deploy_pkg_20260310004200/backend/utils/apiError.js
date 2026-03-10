import { logger } from './logger.js';
export const sendApiError = (req, res, status, payload) => {
    return res.status(status).json({
        code: payload.code,
        message: payload.message,
        details: payload.details,
        requestId: req.requestId
    });
};
export const logRouteError = (req, scope, error) => {
    logger.error(`[${req.requestId}] ${scope}`, {
        error: error instanceof Error ? error.message : String(error)
    });
};
