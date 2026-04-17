import { Controller, Get, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {}

  @Get()
  async checkHealth() {
    const health = await this.healthService.getHealthStatus();
    if (health.status === 'ok') {
      return health;
    }
    // For unhealthy status, we could throw an HttpException but we'll just return 200 with status field
    // In production you might want to return 503
    return health;
  }

  @Get('ready')
  ready() {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('live')
  live() {
    return { status: 'live', timestamp: new Date().toISOString() };
  }
}