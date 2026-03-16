import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';

@Controller('webhooks/payments')
@UseGuards(WebhookSignatureGuard)
export class PaymentWebhookController {
  constructor(private service: PaymentsService, private events: EventBusService) {}

  @Post('healthpay/:tenantId') @ApiExcludeEndpoint()
  async healthpay(@Param('tenantId') tid: string, @Body() body: any) {
    const result = await this.service.handleWebhook(tid, 'healthpay', body);
    if (result?.status === 'COMPLETED') await this.events.onPaymentCompleted(tid, result);
    if (result?.status === 'FAILED') await this.events.onPaymentFailed(tid, result);
    return { received: true };
  }

  @Post('fawry/:tenantId') @ApiExcludeEndpoint()
  async fawry(@Param('tenantId') tid: string, @Body() body: any) {
    const result = await this.service.handleWebhook(tid, 'fawry', body);
    if (result?.status === 'COMPLETED') await this.events.onPaymentCompleted(tid, result);
    return { received: true };
  }

  @Post('vodafone/:tenantId') @ApiExcludeEndpoint()
  async vodafone(@Param('tenantId') tid: string, @Body() body: any) {
    const result = await this.service.handleWebhook(tid, 'vodafone', body);
    if (result?.status === 'COMPLETED') await this.events.onPaymentCompleted(tid, result);
    return { received: true };
  }
}
