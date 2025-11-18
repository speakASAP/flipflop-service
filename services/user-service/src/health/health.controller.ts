/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from '@e-commerce/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    const status = await this.healthService.getHealthStatus('user-service');
    return status;
  }
}

