import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentWebhookController } from './payment-webhook.controller';
import { HealthPayGateway } from './gateways/healthpay.gateway';
import { FawryGateway } from './gateways/fawry.gateway';
import { VodafoneCashGateway } from './gateways/vodafone-cash.gateway';
@Module({
  controllers: [PaymentsController, PaymentWebhookController],
  providers: [PaymentsService, HealthPayGateway, FawryGateway, VodafoneCashGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
