import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty() @IsString()
  currentPassword: string;

  @ApiProperty() @IsString() @MinLength(8)
  newPassword: string;
}

export class ResetPasswordRequestDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsString()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString()
  token: string;

  @ApiProperty() @IsString() @MinLength(8)
  newPassword: string;
}
