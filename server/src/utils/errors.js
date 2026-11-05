export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === 'ZodError')
    return res.status(400).json({
      error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      code: 'VALIDATION_ERROR',
    });
  if (error.code === 11000)
    return res.status(409).json({ error: 'This record already exists.', code: 'CONFLICT' });
  if (error.code === 'LIMIT_FILE_SIZE')
    return res
      .status(400)
      .json({ error: 'Each attachment must be 10 MB or smaller.', code: 'FILE_TOO_LARGE' });
  const status = error.status || 500;
  if (status >= 500)
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'request_failed',
        requestId: req.requestId,
        message: error.message,
      }),
    );
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again or contact support.' : error.message,
    code: error.code || 'REQUEST_ERROR',
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });
}
