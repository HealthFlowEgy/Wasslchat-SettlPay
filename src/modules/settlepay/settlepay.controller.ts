import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettlePayService } from './settlepay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';
import { TopUpDto, WalletPayDto, VerifyOtpDto, SendPaymentRequestDto, RefundDto } from './dto/settlepay.dto';

@ApiTags('SettlePay Wallet')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settlepay')
export class SettlePayController {
  constructor(private service: SettlePayService) {}

  // ===== MERCHANT WALLET (OTP flow) =====

  @Post('merchant/setup') @Roles('OWNER')
  @ApiOperation({ summary: 'Initiate merchant wallet setup — sends OTP to owner phone' })
  async initMerchantSetup(@TenantId() tid: string) {
    return this.service.initMerchantSetup(tid);
  }

  @Post('merchant/verify') @Roles('OWNER')
  @ApiOperation({ summary: 'Verify merchant OTP and activate wallet' })
  async verifyMerchantOtp(@TenantId() tid: string, @Body() dto: VerifyOtpDto) {
    return this.service.verifyMerchantOtp(tid, dto.mobile, dto.otp);
  }

  @Get('merchant/wallet')
  @ApiOperation({ summary: 'Get merchant wallet with live balance from HealthPay' })
  async getMerchantWallet(@TenantId() tid: string) {
    return this.service.getMerchantWallet(tid);
  }

  @Get('merchant/transactions')
  @ApiOperation({ summary: 'Get merchant wallet transactions' })
  async getMerchantTx(@TenantId() tid: string) {
    return this.service.getMerchantTransactions(tid);
  }

  // ===== CUSTOMER WALLETS (OTP flow) =====

  @Post('customers/:contactId/setup')
  @ApiOperation({ summary: 'Initiate customer wallet setup — sends OTP to customer phone' })
  async initCustomerSetup(@TenantId() tid: string, @Param('contactId') cid: string) {
    return this.service.initCustomerSetup(tid, cid);
  }

  @Post('customers/:contactId/verify')
  @ApiOperation({ summary: 'Verify customer OTP and activate wallet' })
  async verifyCustomerOtp(@TenantId() tid: string, @Param('contactId') cid: string, @Body() dto: VerifyOtpDto) {
    return this.service.verifyCustomerOtp(tid, cid, dto.mobile, dto.otp);
  }

  @Get('customers/:contactId/wallet')
  @ApiOperation({ summary: 'Get customer wallet with balance' })
  async getCustomerWallet(@TenantId() tid: string, @Param('contactId') cid: string) {
    return this.service.getCustomerWallet(tid, cid);
  }

  @Get('customers/:contactId/transactions')
  @ApiOperation({ summary: 'Get customer wallet transactions and payment requests' })
  async getCustomerTx(@TenantId() tid: string, @Param('contactId') cid: string) {
    return this.service.getCustomerTransactions(tid, cid);
  }

  @Post('customers/:contactId/topup')
  @ApiOperation({ summary: 'Top up customer wallet — returns iframeUrl for payment gateway' })
  async topUp(@TenantId() tid: string, @Param('contactId') cid: string, @Body() dto: TopUpDto) {
    return this.service.topUpCustomerWallet(tid, cid, dto.amount);
  }

  // ===== PAYMENTS =====

  @Post('pay/:orderId/wallet')
  @ApiOperation({ summary: 'Pay order by deducting from customer HealthPay wallet' })
  async payWithWallet(@TenantId() tid: string, @Param('orderId') oid: string, @Body() dto: WalletPayDto) {
    return this.service.payWithWallet(tid, oid, dto.contactId);
  }

  @Post('pay/:orderId/request')
  @ApiOperation({ summary: 'Send payment request to customer — auto-deducts on acceptance' })
  async sendPaymentRequest(@TenantId() tid: string, @Param('orderId') oid: string, @Body() dto: SendPaymentRequestDto) {
    return this.service.sendPaymentRequest(tid, oid, dto.contactId);
  }

  @Post('refund')
  @ApiOperation({ summary: 'Refund amount from merchant wallet to customer wallet' })
  async refund(@TenantId() tid: string, @Body() dto: RefundDto) {
    return this.service.refundToCustomer(tid, dto.contactId, dto.amount, dto.description);
  }

  // ===== ADMIN =====

  @Get('wallets') @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List all wallets (merchant + customer) with balances' })
  async listWallets(@TenantId() tid: string, @Query('type') type: string) {
    return this.service.listWallets(tid, type);
  }
}
