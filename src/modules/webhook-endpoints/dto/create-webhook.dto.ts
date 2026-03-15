import { IsString, IsArray, IsUrl, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookEndpointDto {
  @ApiProperty({ example: 'https://myapp.com/webhooks/wasslchat' }) @IsUrl() url: string;
  @ApiProperty({ example: ['order.created', 'payment.completed'], description: 'Event types to subscribe. Use ["*"] for all.' }) @IsArray() @IsString({ each: true }) events: string[];
}

export class UpdateWebhookEndpointDto {
  @ApiPropertyOptional() @IsOptional() @IsUrl() url?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() events?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
