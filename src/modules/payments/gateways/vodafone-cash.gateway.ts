import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class VodafoneCashGateway {
  private readonly logger = new Logger(VodafoneCashGateway.name);
  constructor(private config: ConfigService) {}

  async createPayment(data: { orderId: string; amount: number; customerPhone: string }) {
    const baseUrl = this.config.get('VODAFONE_CASH_API_URL');
    if (!baseUrl) {
      this.logger.warn('Vodafone Cash API URL not configured — returning mock response');
      return { reference: `VC-${Date.now().toString(36).toUpperCase()}`, status: 'pending', paymentPhone: data.customerPhone, instructions: `ادفع ${data.amount} ج.م عبر فودافون كاش إلى الرقم 01012345678 ثم أرسل رقم التحويل` };
    }
    try {
      const res = await axios.post(`${baseUrl}/payments`, {
        amount: data.amount, merchantPhone: this.config.get('VODAFONE_CASH_MERCHANT_PHONE'),
        customerPhone: data.customerPhone, orderId: data.orderId,
      });
      return { reference: res.data.reference, status: 'pending' };
    } catch (err: any) {
      this.logger.error(`Vodafone Cash error: ${err.message}`);
      throw err;
    }
  }
}
