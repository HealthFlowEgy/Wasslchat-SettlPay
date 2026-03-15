import { Controller, Get, Post, Patch, Delete, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId, CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get() @ApiOperation({ summary: 'List notifications with unread count' })
  async findAll(@TenantId() tid: string, @CurrentUser('sub') uid: string, @Query() query: any) { return this.service.findAll(tid, uid, query); }

  @Patch(':id/read') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(@TenantId() tid: string, @CurrentUser('sub') uid: string, @Param('id') id: string) { return this.service.markAsRead(tid, uid, id); }

  @Post('read-all') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@TenantId() tid: string, @CurrentUser('sub') uid: string) { return this.service.markAllAsRead(tid, uid); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @ApiOperation({ summary: 'Delete notification' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
