import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Contacts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private service: ContactsService) {}

  @Get() @ApiOperation({ summary: 'List contacts' })
  async findAll(@TenantId() tid: string, @Query() query: any) { return this.service.findAll(tid, query); }

  @Get('export/csv') @ApiOperation({ summary: 'Export contacts as CSV' })
  async exportCsv(@TenantId() tid: string) { return this.service.exportCsv(tid); }

  @Get('duplicates') @ApiOperation({ summary: 'Find potential duplicate contacts' })
  async findDuplicates(@TenantId() tid: string) { return this.service.findDuplicates(tid); }

  @Get(':id') @ApiOperation({ summary: 'Get contact details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Post() @ApiOperation({ summary: 'Create contact' })
  async create(@TenantId() tid: string, @Body() dto: CreateContactDto) { return this.service.create(tid, dto); }

  @Post('import') @ApiOperation({ summary: 'Import contacts from CSV' })
  async importCsv(@TenantId() tid: string, @Body() dto: { csv: string }) { return this.service.importFromCsv(tid, dto.csv); }

  @Patch(':id') @ApiOperation({ summary: 'Update contact' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateContactDto>) { return this.service.update(tid, id, dto); }

  @Post(':id/tags') @ApiOperation({ summary: 'Add tag to contact' })
  async addTag(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { tagId: string }) { return this.service.addTag(tid, id, dto.tagId); }

  @Post(':id/block') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Block contact' })
  async block(@TenantId() tid: string, @Param('id') id: string) { return this.service.block(tid, id); }

  @Post(':id/unblock') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Unblock contact' })
  async unblock(@TenantId() tid: string, @Param('id') id: string) { return this.service.unblock(tid, id); }

  @Post('merge') @ApiOperation({ summary: 'Merge two duplicate contacts' })
  async merge(@TenantId() tid: string, @Body() dto: { primaryId: string; secondaryId: string }) {
    return this.service.merge(tid, dto.primaryId, dto.secondaryId);
  }
}
