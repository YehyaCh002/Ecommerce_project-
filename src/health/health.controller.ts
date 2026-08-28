import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  getRoot() {
    return {
      message: 'E-commerce API with Fastify, TypeScript, PostgreSQL, and TypeORM',
      status: 'running',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
