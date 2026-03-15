import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCouponDto {
  @ApiProperty({ example: 'WELCOME10' }) @IsString() code: string;
  @ApiProperty({ enum: ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] }) @IsEnum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING'] as const) type: string;
  @ApiProperty({ example: 10 }) @IsNumber() @Min(0) value: number;
  @ApiPropertyOptional({ example: 200 }) @IsOptional() @IsNumber() minOrderAmount?: number;
  @ApiPropertyOptional({ example: 100 }) @IsOptional() @IsNumber() maxDiscount?: number;
  @ApiPropertyOptional({ example: 100 }) @IsOptional() @IsNumber() maxUses?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() applicableProducts?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() applicableCategories?: string[];
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'WELCOME10' }) @IsString() code: string;
  @ApiProperty({ example: 500 }) @IsNumber() @Min(0) orderTotal: number;
}
