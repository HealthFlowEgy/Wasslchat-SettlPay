import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendTextDto {
  @ApiProperty({ example: 'أهلاً بيك! كيف أقدر أساعدك؟' }) @IsString() text: string;
}

export class SendMediaDto {
  @ApiProperty({ example: 'https://cdn.example.com/product.jpg' }) @IsString() mediaUrl: string;
  @ApiProperty({ enum: ['image', 'video', 'audio', 'document'] }) @IsIn(['image', 'video', 'audio', 'document']) mediaType: string;
  @ApiPropertyOptional({ example: 'صورة المنتج' }) @IsOptional() @IsString() caption?: string;
}
