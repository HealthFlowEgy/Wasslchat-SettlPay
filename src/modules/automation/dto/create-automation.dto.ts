import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAutomationDto {
  @ApiProperty({ example: 'ترحيب العميل الجديد' }) @IsString() name: string;
  @ApiProperty({ example: 'contact.created', description: 'Trigger event name' }) @IsString() event: string;
  @ApiPropertyOptional({ type: 'array', example: [{ field: 'source', operator: 'equals', value: 'WHATSAPP' }] }) @IsOptional() @IsArray() conditions?: any[];
  @ApiProperty({ type: 'array', example: [{ type: 'send_message', template: '/hello' }] }) @IsArray() actions: any[];
}
