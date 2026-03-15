import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBroadcastDto {
  @ApiProperty({ example: 'عروض رمضان' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'مرحبا! عروض خاصة بمناسبة رمضان الكريم 🌙' })
  @IsOptional() @IsString()
  content?: string;

  @ApiPropertyOptional({ example: 'ramadan_offer' })
  @IsOptional() @IsString()
  templateName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  templateLang?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ example: { tagIds: [], governorate: 'القاهرة' } })
  @IsOptional() @IsObject()
  audience?: any;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  scheduledAt?: string;
}
