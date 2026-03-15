import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuickRepliesService } from './quick-replies.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Quick Replies')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('quick-replies')
export class QuickRepliesController {
  constructor(private service: QuickRepliesService) {}

  @Get() @ApiOperation({ summary: 'List quick replies' })
  async findAll(@TenantId() tid: string, @Query('category') cat: string) { return this.service.findAll(tid, cat); }

  @Post() @ApiOperation({ summary: 'Create quick reply' })
  async create(@TenantId() tid: string, @Body() dto: CreateQuickReplyDto) { return this.service.create(tid, dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update quick reply' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateQuickReplyDto>) { return this.service.update(tid, id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Delete quick reply' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
