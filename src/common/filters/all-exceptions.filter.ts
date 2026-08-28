import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { FastifyReply } from 'fastify';

// Map error message patterns to appropriate HTTP status codes
const resolveStatus = (message: string): number => {
  if (message.includes('not found') || message.includes('does not exist')) return 404;
  if (message.includes('already exists') || message.includes('duplicate')) return 409;
  if (message.toLowerCase().includes('disabled')) return 409;
  if (message.includes('Insufficient stock')) return 422;
  if (message.includes('Invalid') || message.includes('required')) return 400;
  if (message.includes('Unauthorized') || message.includes('Authentication')) return 401;
  if (message.includes('Forbidden') || message.includes('access')) return 403;
  return 500;
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        response
          .status(status)
          .send({ success: false, message: body, statusCode: status, error: exception.name });
        return;
      }

      response.status(status).send({ success: false, ...body });
      return;
    }

    const message = exception instanceof Error ? exception.message : 'Internal Server Error';
    const status = resolveStatus(message);

    if (status === 500) {
      console.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).send({
      success: false,
      message: status === 500 ? 'Internal Server Error' : message,
      error: process.env.NODE_ENV === 'development' && status === 500 ? message : undefined,
    });
  }
}
