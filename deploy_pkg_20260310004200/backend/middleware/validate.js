import { sendApiError } from '../utils/apiError.js';
const parseOrFail = (req, res, schema, value, code, message) => {
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
export const validateRequest = (schemas) => {
    return (req, res, next) => {
        if (schemas.params) {
            const parsedParams = parseOrFail(req, res, schemas.params, req.params, 'INVALID_PARAMS', 'Invalid route parameters');
            if (!parsedParams)
                return;
            req.params = parsedParams;
        }
        if (schemas.query) {
            const parsedQuery = parseOrFail(req, res, schemas.query, req.query, 'INVALID_QUERY', 'Invalid query parameters');
            if (!parsedQuery)
                return;
            req.query = parsedQuery;
        }
        if (schemas.body) {
            const parsedBody = parseOrFail(req, res, schemas.body, req.body, 'INVALID_BODY', 'Invalid request body');
            if (!parsedBody)
                return;
            req.body = parsedBody;
        }
        next();
    };
};
