import { IsString, IsEmail, IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateContactDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' }) email?: string;
  @IsOptional() @IsString() @Matches(/^[0-9]{14}$/, { message: 'الرقم القومي يجب أن يكون 14 رقم' }) nationalId?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() governorate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isBlocked?: boolean;
}
