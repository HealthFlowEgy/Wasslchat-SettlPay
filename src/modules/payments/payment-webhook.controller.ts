import { Controller, Post, Body, Param } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';

@Controller('webhooks/payments')
export class PaymentWebhookController {
  constructor(private service: PaymentsService) {}

  @Post('healthpay/:tenantId') @ApiExcludeEndpoint()
  async healthpay(@Param('tenantId') tid: string, @Body() body: any) {
    await this.service.handleWebhook(tid, 'healthpay', body);
    return { received: true };
  }

  @Post('fawry/:tenantId') @ApiExcludeEndpoint()
  async fawry(@Param('tenantId') tid: string, @Body() body: any) {
    await this.service.handleWebhook(tid, 'fawry', body);
    return { received: true };
  }

  @Post('vodafone/:tenantId') @ApiExcludeEndpoint()
  async vodafone(@Param('tenantId') tid: string, @Body() body: any) {
    await this.service.handleWebhook(tid, 'vodafone', body);
    return { received: true };
  }
}
