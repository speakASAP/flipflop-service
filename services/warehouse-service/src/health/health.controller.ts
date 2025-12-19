/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from '@flipflop/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    const status = await this.healthService.getHealthStatus('warehouse-service');
    return status;
  }
}

