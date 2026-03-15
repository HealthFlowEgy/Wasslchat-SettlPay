import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @ApiProperty({ enum: ['WOOCOMMERCE', 'SHOPIFY', 'CUSTOM_API'] }) @IsEnum(['WOOCOMMERCE', 'SHOPIFY', 'CUSTOM_API'] as const) type: string;
  @ApiProperty({ example: 'My WooCommerce Store' }) @IsString() name: string;
  @ApiPropertyOptional({ example: 'https://mystore.com' }) @IsOptional() @IsString() storeUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apiKey?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() apiSecret?: string;
}

export class CreateShipmentDto {
  @ApiProperty({ enum: ['WASSLBOX', 'BOSTA'] }) @IsEnum(['WASSLBOX', 'BOSTA'] as const) provider: string;
}
