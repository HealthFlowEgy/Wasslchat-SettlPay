import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuickReplyDto {
  @ApiProperty({ example: '/hello' }) @IsString() shortcut: string;
  @ApiProperty({ example: 'أهلاً وسهلاً! كيف أقدر أساعدك؟' }) @IsString() content: string;
  @ApiPropertyOptional() @IsOptional() @IsString() contentAr?: string;
  @ApiPropertyOptional({ example: 'greeting' }) @IsOptional() @IsString() category?: string;
}
