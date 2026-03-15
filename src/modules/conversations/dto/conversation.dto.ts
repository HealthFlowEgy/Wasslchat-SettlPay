import { IsString, IsOptional, IsUUID, IsBoolean, IsNumber, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryConversationsDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) page?: number;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsNumber() @Min(1) limit?: number;
  @ApiPropertyOptional({ enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] }) @IsOptional() @IsIn(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assigneeId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() unreadOnly?: boolean;
}

export class AssignConversationDto {
  @ApiPropertyOptional() @IsUUID() assigneeId: string;
}

export class UpdateConversationStatusDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'] }) @IsIn(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']) status: string;
}
