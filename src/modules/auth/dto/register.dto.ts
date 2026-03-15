import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'صيدلية الحياة' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional({ example: 'Al-Hayat Pharmacy' })
  @IsOptional() @IsString()
  businessNameAr?: string;

  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Mohamed' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '01012345678' })
  @IsOptional()
  @Matches(/^01[0125]\d{8}$/, { message: 'رقم هاتف مصري غير صالح' })
  phone?: string;
}
