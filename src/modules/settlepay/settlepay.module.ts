import { Module } from '@nestjs/common';
import { SettlePayClient } from './settlepay.client';
import { SettlePayService } from './settlepay.service';
import { SettlePayController } from './settlepay.controller';
import { SettlePayWebhookController } from './settlepay-webhook.controller';

@Module({
  controllers: [SettlePayController, SettlePayWebhookController],
  providers: [SettlePayClient, SettlePayService],
  exports: [SettlePayClient, SettlePayService],
})
export class SettlePayModule {}
