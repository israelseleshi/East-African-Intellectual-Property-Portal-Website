const writeLog = (level, message, meta) => {
    const payload = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...(meta ?? {})
    };
    const line = JSON.stringify(payload);
    if (level === 'error') {
        console.error(line);
        return;
    }
    if (level === 'warn') {
        console.warn(line);
        return;
    }
    console.log(line);
};
export const logger = {
    info: (message, meta) => writeLog('info', message, meta),
    warn: (message, meta) => writeLog('warn', message, meta),
    error: (message, meta) => writeLog('error', message, meta)
};
