import { IsString, IsNumber, IsOptional, IsUUID, Min, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '01012345678', description: 'Egyptian mobile number' })
  @IsString()
  @Matches(/^01[0-9]{9}$/, { message: 'رقم الهاتف يجب أن يكون رقم مصري صحيح (01xxxxxxxxx)' })
  mobile: string;

  @ApiProperty({ example: '1234', description: 'OTP received via SMS' })
  @IsString()
  otp: string;
}

export class TopUpDto {
  @ApiProperty({ example: 500, description: 'Amount in EGP' })
  @IsNumber()
  @Min(10, { message: 'الحد الأدنى للشحن 10 ج.م' })
  amount: number;
}

export class WalletPayDto {
  @ApiProperty({ description: 'Contact ID of the paying customer' })
  @IsUUID()
  contactId: string;
}

export class SendPaymentRequestDto {
  @ApiProperty({ description: 'Contact ID of the customer to send payment request to' })
  @IsUUID()
  contactId: string;
}

export class RefundDto {
  @ApiProperty({ description: 'Contact ID of the customer to refund' })
  @IsUUID()
  contactId: string;

  @ApiProperty({ example: 150, description: 'Refund amount in EGP' })
  @IsNumber()
  @Min(1, { message: 'مبلغ الاسترداد يجب أن يكون أكبر من صفر' })
  amount: number;

  @ApiPropertyOptional({ example: 'استرداد طلب رقم #1234' })
  @IsOptional()
  @IsString()
  description: string;
}

export class WithdrawDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(100, { message: 'الحد الأدنى للسحب 100 ج.م' })
  amount: number;

  @ApiProperty({ example: 'البنك الأهلي المصري' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890123' })
  @IsString()
  bankAccountNumber: string;

  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  bankAccountName: string;
}
