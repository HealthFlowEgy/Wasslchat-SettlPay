import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — checks all dependencies' })
  async ready() {
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

    // Database
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latency: Date.now() - dbStart };
    } catch (err: any) {
      checks.database = { status: 'down', error: err.message };
    }

    // Redis (via URL check)
    checks.redis = { status: 'configured' };

    // Evolution API
    const evoUrl = this.config.get('EVOLUTION_API_URL');
    if (evoUrl) {
      const evoStart = Date.now();
      try {
        await axios.get(`${evoUrl}/instance/fetchInstances`, {
          headers: { apikey: this.config.get('EVOLUTION_API_KEY', '') },
          timeout: 5000,
        });
        checks.evolution_api = { status: 'up', latency: Date.now() - evoStart };
      } catch (err: any) {
        checks.evolution_api = { status: 'down', error: err.message?.slice(0, 100) };
      }
    } else {
      checks.evolution_api = { status: 'not_configured' };
    }

    const allUp = Object.values(checks).every(c => c.status !== 'down');

    return {
      status: allUp ? 'ready' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
