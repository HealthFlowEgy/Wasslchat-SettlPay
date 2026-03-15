import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WhatsappTemplatesService } from './whatsapp-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('WhatsApp Templates')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('whatsapp-templates')
export class WhatsappTemplatesController {
  constructor(private service: WhatsappTemplatesService) {}

  @Get() @ApiOperation({ summary: 'List message templates' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Get(':id') @ApiOperation({ summary: 'Get template by ID' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Post() @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create message template' })
  async create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }

  @Patch(':id') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update template' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(tid, id, dto); }

  @Post(':id/submit') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Submit template for WhatsApp approval' })
  async submit(@TenantId() tid: string, @Param('id') id: string) { return this.service.submitForApproval(tid, id); }

  @Post('sync') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Sync approved templates from Cloud API' })
  async sync(@TenantId() tid: string) { return this.service.syncFromCloudApi(tid); }

  @Delete(':id') @Roles('OWNER')
  @ApiOperation({ summary: 'Delete template' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
