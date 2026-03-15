import { IsOptional, IsString, IsNumber, IsBoolean, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryProductsDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  limit?: number;

  @ApiPropertyOptional({ example: 'فستان' }) @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: 'createdAt' }) @IsOptional() @IsIn(['createdAt', 'price', 'name', 'inventoryQuantity'])
  sortBy?: string;

  @ApiPropertyOptional({ default: 'desc' }) @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
