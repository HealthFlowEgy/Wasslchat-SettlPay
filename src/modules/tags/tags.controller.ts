import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Tags')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('tags')
export class TagsController {
  constructor(private service: TagsService) {}

  @Get() @ApiOperation({ summary: 'List all tags with contact count' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @ApiOperation({ summary: 'Create tag' })
  async create(@TenantId() tid: string, @Body() dto: CreateTagDto) { return this.service.create(tid, dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update tag' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateTagDto>) { return this.service.update(tid, id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete tag' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
