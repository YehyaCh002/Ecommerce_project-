import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here';

type AuthRequest = FastifyRequest & {
  userId?: string;
  userRole?: string;
};

// JWT Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: FastifyReply
): Promise<void> => {
  // Check for token in cookies first, fallback to Authorization header
  let token = req.cookies?.accessToken;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401).send({
      success: false,
      message: 'Authentication required. Missing token.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
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
