import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  check(): HealthStatus {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for Kubernetes/Docker' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  ready(): HealthStatus {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check for Kubernetes/Docker' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  live(): HealthStatus {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }
}
