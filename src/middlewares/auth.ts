import { FastifyRequest, FastifyReply } from 'fastify';

type AuthRequest = FastifyRequest & {
  userId?: string;
  userRole?: string;
};

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // Reject non-UUID user IDs early — prevents "invalid input syntax for type uuid" DB errors
  if (!UUID_REGEX.test(userId)) {
    res.status(400).send({
      success: false,
      message: 'Invalid user ID format. Must be a valid UUID.',
    });
    return;
  }

  req.userId = userId;
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
