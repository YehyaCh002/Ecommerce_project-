import { FastifyRequest, FastifyReply } from 'fastify';

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
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const status = resolveStatus(error.message);

  if (status === 500) {
    console.error(error.stack);
  }

  reply.status(status).send({
    success: false,
    message: status === 500 ? 'Internal Server Error' : error.message,
    error: process.env.NODE_ENV === 'development' && status === 500 ? error.message : undefined,
  });
};
