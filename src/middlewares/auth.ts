import { FastifyRequest, FastifyReply } from 'fastify';

type AuthRequest = FastifyRequest & {
  userId?: number;
  userRole?: string;
};

// Simple authentication middleware for MVP
// In production, use JWT or other proper authentication
export const authenticate = async (
  req: AuthRequest,
  res: FastifyReply
): Promise<void> => {
  const userId = req.headers['x-user-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (!userId) {
    res.status(401).send({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const parsedUserId = Number.parseInt(userId, 10);
  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    res.status(400).send({
      success: false,
      message: 'Invalid user ID format. Must be a positive integer.',
    });
    return;
  }

  req.userId = parsedUserId;
  req.userRole = userRole || 'customer';
};

export const requireAdmin = async (
  req: AuthRequest,
  res: FastifyReply
): Promise<void> => {
  if (req.userRole !== 'admin') {
    res.status(403).send({
      success: false,
      message: 'Admin access required',
    });
    return;
  }
};
