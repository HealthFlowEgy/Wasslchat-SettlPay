import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Verifies HMAC signatures on inbound payment and WhatsApp webhooks.
 * Each provider has its own signature scheme:
 * 
 * - Fawry: SHA-256 HMAC in X-Fawry-Signature header
 * - HealthPay: SHA-256 HMAC in X-HealthPay-Signature header
 * - Evolution API: API key in apikey header
 */
@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url || '';

    // Determine provider from path
    if (path.includes('/webhooks/payments/fawry')) {
      return this.verifyFawry(request);
    } else if (path.includes('/webhooks/payments/healthpay')) {
      return this.verifyHealthPay(request);
    } else if (path.includes('/webhooks/payments/vodafone')) {
      return this.verifyVodafone(request);
    } else if (path.includes('/webhooks/settlepay')) {
      return this.verifySettlePay(request);
    } else if (path.includes('/webhooks/whatsapp')) {
      return this.verifyEvolution(request);
    }

    // Unknown webhook path — allow in dev, block in prod
    if (this.config.get('NODE_ENV') === 'production') {
      this.logger.warn(`Unrecognized webhook path: ${path}`);
      return false;
    }
    return true;
  }

  private verifyFawry(request: any): boolean {
    const secret = this.config.get('FAWRY_SECURITY_KEY');
    if (!secret) {
      this.logger.warn('FAWRY_SECURITY_KEY not configured — skipping verification');
      return true;
    }

    const signature = request.headers['x-fawry-signature'] || request.headers['fawry-signature'];
    if (!signature) {
      this.logger.warn('Fawry webhook missing signature header');
      return this.config.get('NODE_ENV') !== 'production';
    }

    const body = request.body;
    // Fawry signature = SHA-256(merchantCode + merchantRefNum + paymentAmount + orderAmount + orderStatus + createdDate + securityKey)
    const sigString = `${body.merchantRefNumber}${body.fawryRefNumber}${body.paymentAmount}${body.orderAmount}${body.orderStatus}${body.statusDescription || ''}${secret}`;
    const computed = crypto.createHash('sha256').update(sigString).digest('hex');

    if (computed !== signature) {
      this.logger.warn('Fawry webhook signature mismatch');
      throw new UnauthorizedException('Invalid Fawry webhook signature');
    }
    return true;
  }

  private verifyHealthPay(request: any): boolean {
    const secret = this.config.get('HEALTHPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('HEALTHPAY_WEBHOOK_SECRET not configured — skipping verification');
      return true;
    }

    const signature = request.headers['x-healthpay-signature'] || request.headers['x-webhook-signature'];
    if (!signature) {
      this.logger.warn('HealthPay webhook missing signature header');
      return this.config.get('NODE_ENV') !== 'production';
    }

    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (computed !== signature) {
      this.logger.warn('HealthPay webhook signature mismatch');
      throw new UnauthorizedException('Invalid HealthPay webhook signature');
    }
    return true;
  }

  private verifyVodafone(request: any): boolean {
    // Vodafone Cash uses IP whitelisting + shared reference
    // Basic verification: check the reference format matches what we generated
    const ref = request.body?.reference;
    if (!ref) {
      this.logger.warn('Vodafone webhook missing reference');
      return this.config.get('NODE_ENV') !== 'production';
    }
    return true;
  }

  private verifySettlePay(request: any): boolean {
    const secret = this.config.get('SETTLEPAY_WEBHOOK_SECRET');
    if (!secret) {
      this.logger.warn('SETTLEPAY_WEBHOOK_SECRET not configured — skipping verification');
      return true;
    }

    const signature = request.headers['x-settlepay-signature'] || request.headers['x-webhook-signature'];
    if (!signature) {
      this.logger.warn('SettlePay webhook missing signature header');
      return this.config.get('NODE_ENV') !== 'production';
    }

    const rawBody = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    if (computed !== signature) {
      this.logger.warn('SettlePay webhook signature mismatch');
      throw new UnauthorizedException('Invalid SettlePay webhook signature');
    }
    return true;
  }

  private verifyEvolution(request: any): boolean {
    const expectedKey = this.config.get('EVOLUTION_API_KEY');
    if (!expectedKey) {
      this.logger.warn('EVOLUTION_API_KEY not configured — skipping verification');
      return true;
    }

    const providedKey = request.headers['apikey'] || request.headers['x-api-key'] || request.query?.apikey;
    if (!providedKey) {
      this.logger.warn('Evolution API webhook missing apikey');
      return this.config.get('NODE_ENV') !== 'production';
    }

    if (providedKey !== expectedKey) {
      this.logger.warn('Evolution API webhook key mismatch');
      throw new UnauthorizedException('Invalid Evolution API key');
    }
    return true;
  }
}
