import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get() @ApiOperation({ summary: 'Liveness probe' })
  async health() { return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }; }

  @Get('ready') @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ready', database: 'connected' }; }
    catch { return { status: 'not_ready', database: 'disconnected' }; }
  }
}
