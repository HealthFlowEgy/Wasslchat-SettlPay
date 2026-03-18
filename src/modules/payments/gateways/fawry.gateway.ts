import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class FawryGateway {
  private readonly logger = new Logger(FawryGateway.name);
  constructor(private config: ConfigService) {}

  async createPayment(data: { orderId: string; amount: number; customerPhone: string; customerEmail?: string }) {
    const merchantCode = this.config.get('FAWRY_MERCHANT_CODE');
    const securityKey = this.config.get('FAWRY_SECURITY_KEY');
    const baseUrl = this.config.get('FAWRY_BASE_URL', 'https://atfawry.fawrystaging.com');

    const chargeRequest = {
      merchantCode, merchantRefNum: data.orderId,
      customerMobile: data.customerPhone, customerEmail: data.customerEmail || '',
      paymentMethod: 'PAYATFAWRY',
      amount: data.amount, currencyCode: 'EGP',
      chargeItems: [{ itemId: data.orderId, description: 'WasslChat Order', price: data.amount, quantity: 1 }],
      returnUrl: `${this.config.get('API_BASE_URL')}/webhooks/payments/fawry`,
    };

    // Generate signature
    const sigString = `${merchantCode}${data.orderId}${data.customerPhone}PAYATFAWRY${data.amount}${securityKey}`;
    chargeRequest['signature'] = crypto.createHash('sha256').update(sigString).digest('hex');

    try {
      const res = await axios.post(`${baseUrl}/ECommerceWeb/Fawry/payments/charge`, chargeRequest);
      return { referenceNumber: res.data.referenceNumber, statusCode: res.data.statusCode, expiresAt: res.data.expirationTime, status: 'pending' };
    } catch (err: any) {
      this.logger.error(`Fawry error: ${err.message}`);
      throw err;
    }
  }

  async refund(data: { fawryRefNo: string; amount: number; reason?: string }) {
    const merchantCode = this.config.get('FAWRY_MERCHANT_CODE');
    const securityKey = this.config.get('FAWRY_SECURITY_KEY');
    const baseUrl = this.config.get('FAWRY_BASE_URL', 'https://atfawry.fawrystaging.com');

    const sigString = `${merchantCode}${data.fawryRefNo}${data.amount}${securityKey}`;
    const signature = crypto.createHash('sha256').update(sigString).digest('hex');

    try {
      const res = await axios.post(`${baseUrl}/ECommerceWeb/Fawry/payments/refund`, {
        merchantCode, fawryRefNum: data.fawryRefNo, refundAmount: data.amount,
        reason: data.reason || 'Customer refund request', signature,
      });
      return { success: true, statusCode: res.data.statusCode, refundRef: res.data.referenceNumber };
    } catch (err: any) {
      this.logger.error(`Fawry refund error: ${err.message}`);
      throw err;
    }
  }
}
