import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HealthPayGateway } from './gateways/healthpay.gateway';
import { FawryGateway } from './gateways/fawry.gateway';
import { VodafoneCashGateway } from './gateways/vodafone-cash.gateway';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private prisma: PrismaService, private healthpay: HealthPayGateway, private fawry: FawryGateway, private vodafone: VodafoneCashGateway) {}

  async initiatePayment(tenantId: string, orderId: string, method: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, tenantId }, include: { contact: true } });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.paymentStatus === 'COMPLETED') throw new BadRequestException('الطلب مدفوع بالفعل');

    let gatewayResult: any;
    switch (method) {
      case 'HEALTHPAY':
        gatewayResult = await this.healthpay.createPayment({ orderId: order.id, amount: order.total, currency: order.currency, customerPhone: order.contact.phone, description: `طلب رقم ${order.orderNumber}` });
        break;
      case 'FAWRY':
        gatewayResult = await this.fawry.createPayment({ orderId: order.id, amount: order.total, customerPhone: order.contact.phone, customerEmail: order.contact.email });
        break;
      case 'VODAFONE_CASH':
        gatewayResult = await this.vodafone.createPayment({ orderId: order.id, amount: order.total, customerPhone: order.contact.phone });
        break;
      case 'COD':
        gatewayResult = { status: 'pending', reference: `COD-${order.orderNumber}` };
        break;
      default:
        throw new BadRequestException(`وسيلة دفع غير مدعومة: ${method}`);
    }

    const tx = await this.prisma.paymentTransaction.create({
      data: {
        tenantId, orderId, method: method as any, amount: order.total, currency: order.currency,
        gatewayRef: gatewayResult.reference || gatewayResult.paymentId,
        fawryRefNo: method === 'FAWRY' ? gatewayResult.referenceNumber : null,
        healthpayTxId: method === 'HEALTHPAY' ? gatewayResult.transactionId : null,
        expiresAt: gatewayResult.expiresAt ? new Date(gatewayResult.expiresAt) : null,
      },
    });

    await this.prisma.order.update({ where: { id: orderId }, data: { paymentMethod: method as any, paymentStatus: 'PROCESSING' } });
    return { transaction: tx, gateway: gatewayResult };
  }

  async handleWebhook(tenantId: string, provider: string, payload: any) {
    this.logger.log(`Payment webhook from ${provider} for tenant ${tenantId}`);
    let tx: any;

    if (provider === 'healthpay') {
      tx = await this.prisma.paymentTransaction.findFirst({ where: { healthpayTxId: payload.transactionId } });
    } else if (provider === 'fawry') {
      tx = await this.prisma.paymentTransaction.findFirst({ where: { fawryRefNo: payload.referenceNumber } });
    } else if (provider === 'vodafone') {
      tx = await this.prisma.paymentTransaction.findFirst({ where: { vodafoneCashRef: payload.reference } });
    }

    if (!tx) { this.logger.warn(`Payment transaction not found for webhook`); return; }

    const status = payload.status === 'PAID' || payload.status === 'completed' ? 'COMPLETED' : payload.status === 'FAILED' || payload.status === 'expired' ? 'FAILED' : 'PROCESSING';
    await this.prisma.paymentTransaction.update({
      where: { id: tx.id },
      data: { status: status as any, gatewayResponse: payload, ...(status === 'COMPLETED' ? { paidAt: new Date() } : {}), ...(status === 'FAILED' ? { failedAt: new Date() } : {}) },
    });

    if (status === 'COMPLETED') {
      await this.prisma.order.update({ where: { id: tx.orderId }, data: { paymentStatus: 'COMPLETED', status: 'CONFIRMED', confirmedAt: new Date() } });
    } else if (status === 'FAILED') {
      await this.prisma.order.update({ where: { id: tx.orderId }, data: { paymentStatus: 'FAILED' } });
    }
  }

  async listPayments(tenantId: string, query: { page?: number; limit?: number; status?: string; method?: string; orderId?: string }) {
    const { page = 1, limit = 20, status, method, orderId } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (method) where.method = method;
    if (orderId) where.orderId = orderId;
    const [data, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({ where, include: { order: { select: { orderNumber: true, contact: { select: { name: true, phone: true } } } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.paymentTransaction.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async refund(tenantId: string, transactionId: string, amount?: number) {
    const tx = await this.prisma.paymentTransaction.findFirst({ where: { id: transactionId, tenantId, status: 'COMPLETED' } });
    if (!tx) throw new NotFoundException('المعاملة غير موجودة أو لم تكتمل');
    const refundAmount = amount || tx.amount;
    // In production: call gateway refund API
    this.logger.log(`Processing refund of ${refundAmount} ${tx.currency} for tx ${tx.id}`);
    await this.prisma.paymentTransaction.update({ where: { id: tx.id }, data: { status: 'REFUNDED', refundedAt: new Date() } });
    await this.prisma.order.update({ where: { id: tx.orderId }, data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' } });
    return { refunded: true, amount: refundAmount, transactionId: tx.id };
  }
}
