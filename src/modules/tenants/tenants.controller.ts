import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Tenant')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tenant')
export class TenantsController {
  constructor(private service: TenantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current tenant info' })
  async getCurrent(@TenantId() tenantId: string) { return this.service.findById(tenantId); }

  @Get('stats')
  @ApiOperation({ summary: 'Get tenant dashboard stats' })
  async getStats(@TenantId() tenantId: string) { return this.service.getStats(tenantId); }

  @Get('settings')
  @ApiOperation({ summary: 'Get tenant settings' })
  async getSettings(@TenantId() tenantId: string) { return this.service.getSettings(tenantId); }

  @Patch('settings')
  @ApiOperation({ summary: 'Update tenant settings' })
  async updateSettings(@TenantId() tenantId: string, @Body() dto: any) { return this.service.updateSettings(tenantId, dto); }

  @Patch()
  @ApiOperation({ summary: 'Update tenant info' })
  async update(@TenantId() tenantId: string, @Body() dto: any) { return this.service.update(tenantId, dto); }
}
