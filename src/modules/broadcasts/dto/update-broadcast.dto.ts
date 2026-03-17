import { IsString, IsOptional, IsDateString, IsUrl, IsObject } from 'class-validator';

export class UpdateBroadcastDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() templateName?: string;
  @IsOptional() @IsString() templateLang?: string;
  @IsOptional() @IsUrl({}, { message: 'رابط الوسائط غير صالح' }) mediaUrl?: string;
  @IsOptional() @IsObject() audience?: Record<string, any>;
  @IsOptional() @IsDateString({}, { message: 'تاريخ الجدولة غير صالح' }) scheduledAt?: string;
}
