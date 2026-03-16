import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MonitoringService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringService.name);
  private sentry: any = null;
  private enabled = false;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const dsn = this.config.get('SENTRY_DSN');
    if (!dsn) { this.logger.log('Sentry DSN not configured — monitoring disabled'); return; }
    try {
      const Sentry = require('@sentry/node');
      Sentry.init({
        dsn, environment: this.config.get('NODE_ENV', 'development'),
        release: `wasslchat@${this.config.get('APP_VERSION', '1.0.0')}`,
        tracesSampleRate: this.config.get('NODE_ENV') === 'production' ? 0.1 : 1.0,
      });
      this.sentry = Sentry;
      this.enabled = true;
      this.logger.log('Sentry initialized — error monitoring active');
    } catch (err: any) {
      this.logger.warn(`Sentry init failed (install @sentry/node): ${err.message}`);
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (this.enabled && this.sentry) {
      this.sentry.withScope((scope: any) => {
        if (context) Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
        this.sentry.captureException(error);
      });
    }
    this.logger.error(`[Monitor] ${error.message}`, error.stack);
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (this.enabled && this.sentry) this.sentry.captureMessage(message, level);
  }
}
