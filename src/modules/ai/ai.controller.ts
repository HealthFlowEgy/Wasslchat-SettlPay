import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private service: AiService) {}

  @Post('suggest-reply') @ApiOperation({ summary: 'AI-generated reply suggestion' })
  async suggest(@Body() dto: { message: string; context?: any }) { return this.service.generateReply(dto.message, dto.context); }

  @Post('smart-replies') @ApiOperation({ summary: '3 diverse smart reply suggestions for an inbound message' })
  async smartReplies(@Body() dto: { message: string; context?: { customerName?: string; conversationHistory?: string } }) {
    const replies = await this.service.generateSmartReplies(dto.message, dto.context);
    return { replies };
  }

  @Post('analyze') @ApiOperation({ summary: 'Analyze message intent, sentiment and urgency in one call' })
  async analyze(@Body() dto: { text: string }) {
    return this.service.analyzeMessage(dto.text);
  }

  @Post('classify-intent') @ApiOperation({ summary: 'Classify message intent' })
  async classify(@Body() dto: { message: string }) { return this.service.classifyIntent(dto.message); }

  @Post('sentiment') @ApiOperation({ summary: 'Analyze sentiment' })
  async sentiment(@Body() dto: { text: string }) { return this.service.analyzeSentiment(dto.text); }

  @Post('translate') @ApiOperation({ summary: 'Translate text' })
  async translate(@Body() dto: { text: string; from: string; to: string }) { return this.service.translateText(dto.text, dto.from, dto.to); }

  @Post('summarize-conversation') @ApiOperation({ summary: 'Generate a 2-3 sentence Arabic summary of a message list' })
  async summarize(@Body() dto: { messages: { direction: string; content: string; createdAt: string }[] }) {
    const messages = dto.messages.map(m => ({ ...m, createdAt: new Date(m.createdAt) }));
    const summary = await this.service.summarizeConversation(messages);
    return { summary };
  }
}
