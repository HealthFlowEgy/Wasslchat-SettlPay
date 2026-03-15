import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Audit Log')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private service: AuditLogService) {}

  @Get() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List audit log entries with filters' })
  async findAll(@TenantId() tid: string, @Query() query: any) { return this.service.findAll(tid, query); }
}
