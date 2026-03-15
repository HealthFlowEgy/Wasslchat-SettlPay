import { IsUUID, IsArray, IsOptional, IsString, IsNumber, ValidateNested, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrderItemDto {
  @ApiProperty() @IsUUID()
  productId: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  variantId?: string;

  @ApiProperty({ example: 2 }) @IsNumber() @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty() @IsUUID()
  contactId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ enum: ['HEALTHPAY', 'FAWRY', 'VODAFONE_CASH', 'COD', 'BANK_TRANSFER'] })
  @IsOptional() @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  shippingAddress?: any;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  customerNotes?: string;
}
