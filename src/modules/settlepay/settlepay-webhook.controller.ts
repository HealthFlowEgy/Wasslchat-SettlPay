import { Controller, Post, Body, Param, Logger, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { WebhookSignatureGuard } from '../../common/guards/webhook-signature.guard';

@Controller('webhooks/settlepay')
@UseGuards(WebhookSignatureGuard)
export class SettlePayWebhookController {
  private readonly logger = new Logger(SettlePayWebhookController.name);

  constructor(private prisma: PrismaService, private events: EventBusService) {}

  @Post(':tenantId') @ApiExcludeEndpoint()
  async handleWebhook(@Param('tenantId') tenantId: string, @Body() body: any) {
    this.logger.log(`SettlePay webhook for tenant ${tenantId}: ${body?.event || body?.type}`);

    const event = body?.event || body?.type;

    switch (event) {
      case 'payment.completed':
      case 'transfer.completed': {
        const ref = body?.data?.reference || body?.data?.orderId;
        if (ref) {
          // Find the order and complete payment
          const order = await this.prisma.order.findFirst({
            where: { tenantId, OR: [{ orderNumber: ref }, { id: ref }] },
          });
          if (order) {
            await this.prisma.paymentTransaction.updateMany({
              where: { orderId: order.id, status: 'PROCESSING' },
              data: { status: 'COMPLETED', paidAt: new Date(), gatewayResponse: body.data },
            });
            await this.prisma.order.update({
              where: { id: order.id },
              data: { paymentStatus: 'COMPLETED', status: 'CONFIRMED', confirmedAt: new Date() },
            });
            const tx = await this.prisma.paymentTransaction.findFirst({ where: { orderId: order.id } });
            if (tx) await this.events.onPaymentCompleted(tenantId, tx);
          }
        }
        break;
      }

      case 'payment.failed':
      case 'transfer.failed': {
        const ref = body?.data?.reference;
        if (ref) {
          const order = await this.prisma.order.findFirst({ where: { tenantId, orderNumber: ref } });
          if (order) {
            await this.prisma.paymentTransaction.updateMany({
              where: { orderId: order.id, status: 'PROCESSING' },
              data: { status: 'FAILED', failedAt: new Date(), gatewayResponse: body.data },
            });
            await this.prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'FAILED' } });
          }
        }
        break;
      }

      case 'topup.completed':
        this.logger.log(`Wallet top-up completed: ${body?.data?.amount} ${body?.data?.currency}`);
        break;

      case 'withdrawal.completed':
        this.logger.log(`Withdrawal completed: ${body?.data?.amount}`);
        break;

      default:
        this.logger.debug(`Unhandled SettlePay event: ${event}`);
    }

    return { received: true };
  }
}
