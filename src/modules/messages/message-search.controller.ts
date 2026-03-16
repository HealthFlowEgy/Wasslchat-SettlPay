import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageSearchController {
  constructor(private service: MessagesService) {}

  @Get('search') @ApiOperation({ summary: 'Search messages across all conversations' })
  async search(@TenantId() tid: string, @Query('q') q: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.service.search(tid, q, page, limit);
  }
}
