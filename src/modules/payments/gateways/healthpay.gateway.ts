import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HealthPayGateway {
  private readonly logger = new Logger(HealthPayGateway.name);
  constructor(private config: ConfigService) {}

  async createPayment(data: { orderId: string; amount: number; currency: string; customerPhone: string; description: string }) {
    const baseUrl = this.config.get('HEALTHPAY_API_URL', 'https://healthpay-api.vercel.app/api');
    const apiKey = this.config.get('HEALTHPAY_API_KEY');
    try {
      const res = await axios.post(`${baseUrl}/payments/initiate`, {
        amount: data.amount, currency: data.currency, phone: data.customerPhone,
        description: data.description, orderId: data.orderId, callbackUrl: `${this.config.get('API_BASE_URL')}/webhooks/payments/healthpay`,
      }, { headers: { 'x-api-key': apiKey } });
      return { paymentId: res.data.data?.id, paymentUrl: res.data.data?.paymentUrl, transactionId: res.data.data?.transactionId, status: 'pending' };
    } catch (err: any) {
      this.logger.error(`HealthPay error: ${err.message}`);
      throw err;
    }
  }
}
