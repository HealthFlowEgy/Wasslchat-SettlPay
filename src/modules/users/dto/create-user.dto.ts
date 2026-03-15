import { IsEmail, IsString, MinLength, IsOptional, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@store.com' }) @IsEmail() email: string;
  @ApiProperty({ example: 'SecurePass123!' }) @IsString() @MinLength(8) password: string;
  @ApiProperty({ example: 'Sara' }) @IsString() firstName: string;
  @ApiProperty({ example: 'Ahmed' }) @IsString() lastName: string;
  @ApiPropertyOptional({ example: '01123456789' }) @IsOptional() @Matches(/^01[0125]\d{8}$/) phone?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'], default: 'AGENT' }) @IsOptional() @IsIn(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER']) role?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @IsString() firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lastName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^01[0125]\d{8}$/) phone?: string;
  @ApiPropertyOptional({ enum: ['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'] }) @IsOptional() @IsIn(['ADMIN', 'MANAGER', 'AGENT', 'VIEWER']) role?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
}
