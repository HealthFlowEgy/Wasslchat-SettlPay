import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ChatbotsService } from './chatbots.service';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Chatbots')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chatbots')
export class ChatbotsController {
  constructor(private service: ChatbotsService) {}

  @Get() @ApiOperation({ summary: 'List chatbot flows' })
  async findAll(@TenantId() tid: string) { return this.service.findAll(tid); }

  @Post() @ApiOperation({ summary: 'Create chatbot flow' })
  async create(@TenantId() tid: string, @Body() dto: CreateChatbotDto) { return this.service.create(tid, dto); }

  @Patch(':id') @ApiOperation({ summary: 'Update chatbot flow' })
  async update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: Partial<CreateChatbotDto>) { return this.service.update(tid, id, dto); }

  @Patch(':id/toggle') @ApiOperation({ summary: 'Toggle chatbot active/inactive' })
  async toggle(@TenantId() tid: string, @Param('id') id: string) { return this.service.toggle(tid, id); }

  @Delete(':id') @ApiOperation({ summary: 'Delete chatbot flow' })
  async delete(@TenantId() tid: string, @Param('id') id: string) { return this.service.delete(tid, id); }
}
