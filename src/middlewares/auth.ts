import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

// Simple authentication middleware for MVP
// In production, use JWT or other proper authentication
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  req.userId = userId;
  req.userRole = userRole || 'customer';
  next();
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }
  next();
};
