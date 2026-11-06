import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * Global error handler.
 * Never exposes stack traces or internal details to the client.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';

  // Log internally (never log sensitive data like passwords or tokens)
  if (statusCode >= 500) {
    console.error(`[error] ${statusCode} ${code}: ${err.message}`);
    if (process.env['NODE_ENV'] === 'development') {
      console.error(err.stack);
    }
  }

  // Generic user-facing message for 500s
  const message =
    statusCode >= 500
      ? 'Something went wrong on our end. Please try again shortly.'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

export function createError(message: string, statusCode = 500, code = 'ERROR'): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  return err;
}
