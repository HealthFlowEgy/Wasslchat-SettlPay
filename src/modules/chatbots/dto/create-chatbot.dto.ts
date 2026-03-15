import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatbotDto {
  @ApiProperty({ example: 'ترحيب العملاء' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Customer Welcome' })
  @IsOptional() @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 'مرحبا', description: 'Trigger keyword/pattern' })
  @IsString()
  trigger: string;

  @ApiPropertyOptional({ enum: ['keyword', 'regex', 'starts_with', 'exact'], default: 'keyword' })
  @IsOptional() @IsIn(['keyword', 'regex', 'starts_with', 'exact'])
  triggerType?: string;

  @ApiProperty({ description: 'Bot flow definition (nodes & edges)' })
  @IsObject()
  flowData: any;

  @ApiPropertyOptional({ description: 'Typebot flow ID' })
  @IsOptional() @IsString()
  typebotId?: string;

  @ApiPropertyOptional({ description: 'n8n workflow ID' })
  @IsOptional() @IsString()
  n8nWorkflowId?: string;
}
