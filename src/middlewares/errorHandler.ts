import { Request, Response, NextFunction } from 'express';

// Map error message patterns to appropriate HTTP status codes
const resolveStatus = (message: string): number => {
  if (message.includes('not found') || message.includes('does not exist')) return 404;
  if (message.includes('already exists') || message.includes('duplicate')) return 409;
  if (message.includes('Insufficient stock')) return 422;
  if (message.includes('Invalid') || message.includes('required')) return 400;
  if (message.includes('Unauthorized') || message.includes('Authentication')) return 401;
  if (message.includes('Forbidden') || message.includes('access')) return 403;
  return 500;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = resolveStatus(err.message);

  if (status === 500) {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    message: status === 500 ? 'Internal Server Error' : err.message,
    error: process.env.NODE_ENV === 'development' && status === 500 ? err.message : undefined,
  });
};
