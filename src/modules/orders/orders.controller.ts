import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private service: OrdersService) {}

  @Get() @ApiOperation({ summary: 'List orders' })
  async findAll(@TenantId() tid: string, @Query() query: any) { return this.service.findAll(tid, query); }

  @Get('export/csv') @ApiOperation({ summary: 'Export orders as CSV' })
  async exportCsv(@TenantId() tid: string, @Query() query: any) { return this.service.exportCsv(tid, query); }

  @Get(':id') @ApiOperation({ summary: 'Get order details' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Post() @ApiOperation({ summary: 'Create order' })
  async create(@TenantId() tid: string, @Body() dto: any) { return this.service.create(tid, dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update order details' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: any) { return this.service.update(tid, id, dto); }

  @Patch(':id/status') @ApiOperation({ summary: 'Update order status' })
  async updateStatus(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { status: string }) { return this.service.updateStatus(tid, id, dto.status); }

  @Post(':id/notes') @ApiOperation({ summary: 'Add order note' })
  async addNote(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string, @Body() dto: { content: string; isPublic?: boolean }) {
    return this.service.addNote(tid, id, uid, dto.content, dto.isPublic);
  }
}
