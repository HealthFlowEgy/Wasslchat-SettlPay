import { IsString, IsOptional, IsObject, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWhatsappTemplateDto {
  @ApiProperty({ example: 'order_confirmation' }) @IsString() name: string;
  @ApiPropertyOptional({ default: 'ar' }) @IsOptional() @IsString() language?: string;
  @ApiPropertyOptional({ enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'], default: 'UTILITY' }) @IsOptional() @IsEnum(['UTILITY', 'MARKETING', 'AUTHENTICATION'] as const) category?: string;
  @ApiProperty({ example: 'مرحباً {{1}}! تم تأكيد طلبك رقم {{2}}' }) @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() header?: any;
  @ApiPropertyOptional() @IsOptional() @IsString() footer?: string;
  @ApiPropertyOptional({ type: 'array' }) @IsOptional() @IsArray() buttons?: any[];
}
