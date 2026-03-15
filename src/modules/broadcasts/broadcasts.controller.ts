import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Broadcasts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private service: BroadcastsService) {}

  @Get() @ApiOperation({ summary: 'List broadcast campaigns' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create broadcast campaign' })
  async create(@TenantId() tid: string, @Body() dto: CreateBroadcastDto) { return this.service.create(tid, dto); }

  @Post(':id/send') @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Send broadcast immediately' })
  async send(@TenantId() tid: string, @Param('id') id: string) { return this.service.send(tid, id); }

  @Patch(':id') @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update broadcast (draft/scheduled only)' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateBroadcastDto>) { return this.service.update(tid, id, dto); }

  @Post(':id/duplicate') @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Duplicate broadcast as draft' })
  async duplicate(@TenantId() tid: string, @Param('id') id: string) { return this.service.duplicate(tid, id); }

  @Get(':id/stats') @ApiOperation({ summary: 'Get broadcast delivery stats' })
  async getStats(@TenantId() tid: string, @Param('id') id: string) { return this.service.getStats(tid, id); }

  @Post(':id/cancel') @ApiOperation({ summary: 'Cancel broadcast' })
  async cancel(@TenantId() tid: string, @Param('id') id: string) { return this.service.cancel(tid, id); }
}
