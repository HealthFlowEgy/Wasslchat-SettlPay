import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Categories')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Get() @ApiOperation({ summary: 'List categories' })
  async findAll(@TenantId() tid: string, @Query('includeInactive') inc: string) { return this.service.findAll(tid, inc === 'true'); }

  @Post() @ApiOperation({ summary: 'Create category' })
  async create(@TenantId() tid: string, @Body() dto: CreateCategoryDto) { return this.service.create(tid, dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update category' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.service.update(tid, id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete category' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }

  @Post('reorder') @ApiOperation({ summary: 'Reorder categories' })
  async reorder(@TenantId() tid: string, @Body() items: { id: string; sortOrder: number }[]) { return this.service.reorder(tid, items); }
}
