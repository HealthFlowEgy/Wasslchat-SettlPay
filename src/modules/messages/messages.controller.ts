import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private service: MessagesService) {}

  @Get() @ApiOperation({ summary: 'Get messages in conversation' })
  async findAll(@Param('conversationId') cid: string, @Query() query: any) { return this.service.getByConversation(cid, query); }

  @Post('text') @ApiOperation({ summary: 'Send text message' })
  async sendText(@TenantId() tid: string, @Param('conversationId') cid: string, @CurrentUser('sub') uid: string, @Body() dto: { text: string }) {
    return this.service.sendText(tid, cid, uid, dto.text);
  }

  @Post('media') @ApiOperation({ summary: 'Send media message' })
  async sendMedia(@TenantId() tid: string, @Param('conversationId') cid: string, @CurrentUser('sub') uid: string, @Body() dto: { mediaUrl: string; mediaType: string; caption?: string }) {
    return this.service.sendMedia(tid, cid, uid, dto.mediaUrl, dto.mediaType, dto.caption);
  }
}
