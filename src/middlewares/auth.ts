import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

type AuthRequest = FastifyRequest & {
  userId?: number;
  userRole?: string;
};

// JWT Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: FastifyReply
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).send({
      success: false,
      message: 'Authentication required. Missing Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; role: string };
    req.userId = decoded.id;
    req.userRole = decoded.role;
  } catch (error) {
    res.status(401).send({
      success: false,
      message: 'Invalid or expired token',
    });
    return;
  }
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
