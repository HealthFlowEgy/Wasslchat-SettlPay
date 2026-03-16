import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookSignatureGuard } from '../../src/common/guards/webhook-signature.guard';
import * as crypto from 'crypto';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((key: string) => {
        const vals: Record<string, string> = {
          'FAWRY_SECURITY_KEY': 'fawry-secret',
          'HEALTHPAY_WEBHOOK_SECRET': 'hp-secret',
          'EVOLUTION_API_KEY': 'evo-key',
          'SETTLEPAY_WEBHOOK_SECRET': 'sp-secret',
          'NODE_ENV': 'production',
        };
        return vals[key] || '';
      }),
    };
    guard = new WebhookSignatureGuard(mockConfig);
  });

  const mockContext = (path: string, headers: Record<string, string> = {}, body: any = {}) => ({
    switchToHttp: () => ({
      getRequest: () => ({ path, headers, body, query: {} }),
    }),
  }) as unknown as ExecutionContext;

  describe('SettlePay verification', () => {
    it('should pass with valid HMAC signature', () => {
      const body = JSON.stringify({ event: 'payment.completed' });
      const signature = crypto.createHmac('sha256', 'sp-secret').update(body).digest('hex');
      const ctx = mockContext('/webhooks/settlepay/t1', { 'x-settlepay-signature': signature }, body);
      // Guard reads body as string for HMAC
      (ctx.switchToHttp().getRequest() as any).body = body;
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should reject invalid signature in production', () => {
      const ctx = mockContext('/webhooks/settlepay/t1', { 'x-settlepay-signature': 'bad' }, { event: 'test' });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('should reject missing signature in production', () => {
      const ctx = mockContext('/webhooks/settlepay/t1', {}, {});
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  describe('Evolution API verification', () => {
    it('should pass with correct apikey', () => {
      const ctx = mockContext('/webhooks/whatsapp/t1', { apikey: 'evo-key' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('should reject wrong apikey', () => {
      const ctx = mockContext('/webhooks/whatsapp/t1', { apikey: 'wrong' });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });
});
