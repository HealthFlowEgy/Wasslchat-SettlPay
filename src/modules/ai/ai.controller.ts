import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private service: AiService) {}

  @Post('suggest-reply') @ApiOperation({ summary: 'AI-generated reply suggestion' })
  async suggest(@Body() dto: { message: string; context?: any }) { return this.service.generateReply(dto.message, dto.context); }

  @Post('classify-intent') @ApiOperation({ summary: 'Classify message intent' })
  async classify(@Body() dto: { message: string }) { return this.service.classifyIntent(dto.message); }

  @Post('sentiment') @ApiOperation({ summary: 'Analyze sentiment' })
  async sentiment(@Body() dto: { text: string }) { return this.service.analyzeSentiment(dto.text); }

  @Post('translate') @ApiOperation({ summary: 'Translate text' })
  async translate(@Body() dto: { text: string; from: string; to: string }) { return this.service.translateText(dto.text, dto.from, dto.to); }
}
