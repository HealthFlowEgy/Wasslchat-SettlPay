import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'VIP' }) @IsString() name: string;
  @ApiPropertyOptional({ example: 'عميل مميز' }) @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional({ example: '#f59e0b' }) @IsOptional() @IsString() color?: string;
}
