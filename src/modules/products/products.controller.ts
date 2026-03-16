import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanLimitsGuard, PlanLimit } from '../../common/guards/plan-limits.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PlanLimitsGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get() @ApiOperation({ summary: 'List products with filters' })
  async findAll(@TenantId() tid: string, @Query() query: QueryProductsDto) { return this.service.findAll(tid, query); }

  @Get('low-stock') @ApiOperation({ summary: 'Get low stock products' })
  async lowStock(@TenantId() tid: string) { return this.service.getLowStock(tid); }

  @Get('export/csv') @ApiOperation({ summary: 'Export products as CSV' })
  async exportCsv(@TenantId() tid: string) { return this.service.exportCsv(tid); }

  @Get(':id') @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Post() @PlanLimit('products') @ApiOperation({ summary: 'Create product' })
  async create(@TenantId() tid: string, @Body() dto: CreateProductDto) { return this.service.create(tid, dto); }

  @Patch('bulk') @ApiOperation({ summary: 'Bulk update products' })
  async bulkUpdate(@TenantId() tid: string, @Body() dto: { updates: { id: string; data: Partial<CreateProductDto> }[] }) { return this.service.bulkUpdate(tid, dto.updates); }

  @Patch(':id') @ApiOperation({ summary: 'Update product' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateProductDto>) { return this.service.update(tid, id, dto); }

  @Patch(':id/inventory') @ApiOperation({ summary: 'Update inventory quantity' })
  async updateInventory(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { quantity: number }) { return this.service.updateInventory(tid, id, dto.quantity); }

  @Delete(':id') @ApiOperation({ summary: 'Soft delete product' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
