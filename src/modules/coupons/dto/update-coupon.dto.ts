import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, IsArray, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsNumber() @Min(0) minOrderAmount?: number;
  @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @IsOptional() @IsNumber() @Min(0) maxUses?: number;
  @IsOptional() @IsDateString({}, { message: 'تاريخ البداية غير صالح' }) startsAt?: string;
  @IsOptional() @IsDateString({}, { message: 'تاريخ الانتهاء غير صالح' }) expiresAt?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() applicableProducts?: string[];
  @IsOptional() @IsArray() applicableCategories?: string[];
}
