import { IsString, IsOptional, IsIn, IsArray, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectWhatsappDto {
  @ApiPropertyOptional({ example: 'my-store' }) @IsOptional() @IsString() instanceName?: string;
}

export class SendTextMessageDto {
  @ApiProperty({ example: '01012345678' }) @Matches(/^01[0125]\d{8}$/) phone: string;
  @ApiProperty({ example: 'مرحبا! عندنا عروض جديدة' }) @IsString() text: string;
}

export class SendMediaMessageDto {
  @ApiProperty({ example: '01012345678' }) @Matches(/^01[0125]\d{8}$/) phone: string;
  @ApiProperty({ example: 'https://cdn.example.com/image.jpg' }) @IsString() mediaUrl: string;
  @ApiProperty({ enum: ['image', 'video', 'audio', 'document'] }) @IsIn(['image', 'video', 'audio', 'document']) mediaType: string;
  @ApiPropertyOptional() @IsOptional() @IsString() caption?: string;
}

export class SendCatalogDto {
  @ApiProperty({ example: '01012345678' }) @Matches(/^01[0125]\d{8}$/) phone: string;
  @ApiProperty({ type: [String], description: 'Product IDs to include' }) @IsArray() @IsString({ each: true }) productIds: string[];
}
