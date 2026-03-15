import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WebhookEndpointsService } from './webhook-endpoints.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Webhook Endpoints')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('webhook-endpoints')
export class WebhookEndpointsController {
  constructor(private service: WebhookEndpointsService) {}

  @Get() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List registered webhook endpoints' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Register webhook endpoint' })
  async create(@TenantId() tid: string, @Body() dto: { url: string; events: string[] }) { return this.service.create(tid, dto); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(tid, id, dto); }

  @Post(':id/test') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Send test webhook' })
  async test(@TenantId() tid: string, @Param('id') id: string) { return this.service.test(tid, id); }

  @Delete(':id') @Roles('OWNER')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
