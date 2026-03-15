import { IsString, IsOptional, IsEmail, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: 'صيدلية الحياة' }) @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ example: 'Al-Hayat Pharmacy' }) @IsOptional() @IsString() nameAr?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^01[0125]\d{8}$/) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() governorate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() businessType?: string;
}
