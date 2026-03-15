import { IsString, IsNumber, IsOptional, IsBoolean, IsUUID, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Earbuds' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'سماعات لاسلكية' })
  @IsOptional() @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descriptionAr?: string;

  @ApiProperty({ example: 450 })
  @IsNumber() @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 550 })
  @IsOptional() @IsNumber()
  compareAtPrice?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional() @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ example: 'WE-001' })
  @IsOptional() @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @IsNumber() @Min(0)
  inventoryQuantity?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional() @IsNumber()
  lowStockThreshold?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray()
  images?: string[];
}
