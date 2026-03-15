import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  @Get() @ApiOperation({ summary: 'List payment transactions with filters' })
  async list(@TenantId() tid: string, @Query() query: any) { return this.service.listPayments(tid, query); }

  @Post('initiate/:orderId') @ApiOperation({ summary: 'Initiate payment for order' })
  async initiate(@TenantId() tid: string, @Param('orderId') oid: string, @Body() dto: { method: string }) {
    return this.service.initiatePayment(tid, oid, dto.method);
  }

  @Post(':transactionId/refund') @ApiOperation({ summary: 'Refund a payment' })
  async refund(@TenantId() tid: string, @Param('transactionId') txId: string, @Body() dto: { amount?: number }) {
    return this.service.refund(tid, txId, dto.amount);
  }
}
