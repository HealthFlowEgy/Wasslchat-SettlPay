import { IsString, IsOptional, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiatePaymentDto {
  @ApiProperty({ enum: ['HEALTHPAY', 'FAWRY', 'VODAFONE_CASH', 'COD', 'BANK_TRANSFER', 'CARD'] }) @IsIn(['HEALTHPAY', 'FAWRY', 'VODAFONE_CASH', 'COD', 'BANK_TRANSFER', 'CARD']) method: string;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Partial refund amount. Omit for full refund.' }) @IsOptional() @IsNumber() @Min(0) amount?: number;
}

export class QueryPaymentsDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
  @ApiPropertyOptional({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'] }) @IsOptional() status?: string;
  @ApiPropertyOptional({ enum: ['HEALTHPAY', 'FAWRY', 'VODAFONE_CASH', 'COD'] }) @IsOptional() method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() orderId?: string;
}
