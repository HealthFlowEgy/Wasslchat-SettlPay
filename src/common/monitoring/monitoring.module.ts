import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './sentry.service';

@Global()
@Module({ providers: [MonitoringService], exports: [MonitoringService] })
export class MonitoringModule {}
