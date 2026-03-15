import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Automation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automation')
export class AutomationController {
  constructor(private service: AutomationService) {}

  @Get() @ApiOperation({ summary: 'List automation rules' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create automation rule' })
  async create(@TenantId() tid: string, @Body() dto: CreateAutomationDto) { return this.service.create(tid, dto); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update automation rule' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateAutomationDto>) { return this.service.update(tid, id, dto); }

  @Patch(':id/toggle') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Toggle automation rule' })
  async toggle(@TenantId() tid: string, @Param('id') id: string) { return this.service.toggle(tid, id); }

  @Delete(':id') @Roles('OWNER')
  @ApiOperation({ summary: 'Delete automation rule' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
