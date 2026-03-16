import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private service: ConversationsService) {}

  @Get() @ApiOperation({ summary: 'List conversations (inbox)' })
  async findAll(@TenantId() tid: string, @Query() query: any) { return this.service.findAll(tid, query); }

  @Get(':id') @ApiOperation({ summary: 'Get conversation with messages' })
  async findOne(@TenantId() tid: string, @Param('id') id: string) { return this.service.findById(tid, id); }

  @Patch(':id/assign') @ApiOperation({ summary: 'Assign conversation to agent' })
  async assign(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { assigneeId: string }) { return this.service.assign(tid, id, dto.assigneeId); }

  @Patch(':id/status') @ApiOperation({ summary: 'Update conversation status' })
  async updateStatus(@TenantId() tid: string, @Param('id') id: string, @Body() dto: { status: string }) { return this.service.updateStatus(tid, id, dto.status); }

  @Post(':id/read') @ApiOperation({ summary: 'Mark as read' })
  async markRead(@TenantId() tid: string, @Param('id') id: string) { return this.service.markAsRead(tid, id); }

  @Post(':id/transfer') @ApiOperation({ summary: 'Transfer conversation to another agent' })
  async transfer(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string, @Body() dto: { toAgentId: string; note?: string }) {
    return this.service.transfer(tid, id, uid, dto.toAgentId, dto.note);
  }
}
