import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: '01012345678' })
  @Matches(/^01[0125]\d{8}$/, { message: 'رقم هاتف مصري غير صالح' })
  phone: string;

  @ApiPropertyOptional({ example: 'أحمد محمد' })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nameAr?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Egyptian National ID (14 digits)' })
  @IsOptional() @Matches(/^[23]\d{13}$/, { message: 'رقم قومي غير صالح' })
  nationalId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  governorate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}
