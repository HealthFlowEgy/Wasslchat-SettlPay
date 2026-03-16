import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SettlePayClient } from './settlepay.client';
import { EventBusService } from '../../common/events/event-bus.service';

/**
 * SettlePay Service
 *
 * Business logic layer for HealthPay wallet integration.
 *
 * HealthPay's user model is OTP-based:
 *   1. loginUser(mobile) → sends SMS OTP to user
 *   2. authUser(mobile, otp) → returns userToken
 *   3. All wallet ops use the userToken
 *
 * For WasslChat, the flow is:
 *   - Merchant registers their phone via OTP → gets a userToken stored locally
 *   - Customer registers via OTP (triggered by merchant) → userToken stored locally
 *   - Payments use deductFromUser (customer→merchant) with the customer's userToken
 *   - Refunds use payToUser (merchant→customer) with the customer's userToken
 *   - Top-ups use topupWalletUser → returns iframeUrl for payment gateway
 */
@Injectable()
export class SettlePayService {
  private readonly logger = new Logger(SettlePayService.name);

  constructor(
    private prisma: PrismaService,
    private client: SettlePayClient,
    private events: EventBusService,
    private configService: ConfigService,
  ) {}

  // =====================================================================
  // MERCHANT WALLET SETUP (OTP-based)
  // =====================================================================

  /**
   * Step 1: Initiate merchant wallet setup.
   * Sends an SMS OTP to the merchant owner's phone number.
   * The frontend must then call verifyMerchantOtp() with the OTP.
   */
  async initMerchantSetup(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { users: { where: { role: 'OWNER' } } },
    });
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة');

    // Check if already has wallet
    const existing = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, ownerType: 'MERCHANT' },
    });
    if (existing) throw new BadRequestException('المتجر لديه محفظة بالفعل');

    const owner = tenant.users[0];
    if (!owner) throw new BadRequestException('المنشأة ليس لها مالك');

    const phone = tenant.phone || owner.phone;
    if (!phone) throw new BadRequestException('يرجى إضافة رقم هاتف للمنشأة أو المالك أولاً');

    // Send OTP to merchant owner's phone
    const result = await this.client.loginUser(
      phone,
      owner.firstName,
      owner.lastName,
      tenant.email,
    );

    this.logger.log(`OTP sent to merchant ${tenant.name} (${phone}), uid: ${result.uid}`);
    return {
      message: `تم إرسال رمز التحقق إلى ${phone}`,
      uid: result.uid,
      phone,
    };
  }

  /**
   * Step 2: Verify merchant OTP and create the wallet mapping.
   * Stores the userToken locally for future deductions.
   */
  async verifyMerchantOtp(tenantId: string, mobile: string, otp: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('المنشأة غير موجودة');

    // Verify OTP — isProvider=true for merchants
    const authResult = await this.client.authUser(mobile, otp, true);

    // Store the wallet mapping
    const localWallet = await this.prisma.settlePayWallet.create({
      data: {
        tenantId,
        ownerType: 'MERCHANT',
        settlePayMemberId: authResult.user.uid,
        settlePayWalletId: authResult.userToken, // userToken acts as wallet identifier
        walletType: 'MAIN',
        currency: 'EGP',
        label: `${tenant.nameAr || tenant.name} — المحفظة الرئيسية`,
      },
    });

    this.logger.log(`Merchant wallet verified for ${tenant.name}`);
    return localWallet;
  }

  /**
   * Get merchant wallet with live balance from HealthPay.
   */
  async getMerchantWallet(tenantId: string) {
    const local = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, ownerType: 'MERCHANT' },
    });
    if (!local) throw new NotFoundException('المحفظة غير مفعّلة — يرجى إعداد SettlePay أولاً');

    try {
      // settlePayWalletId stores the userToken for this merchant
      const wallet = await this.client.userWallet(local.settlePayWalletId);
      return {
        ...local,
        balance: wallet.total || 0,
        transactions: wallet.balance || [], // balance array contains transaction history
      };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch merchant wallet balance: ${err.message}`);
      return { ...local, balance: 0, transactions: [] };
    }
  }

  /**
   * Get merchant payment requests (sent to customers).
   */
  async getMerchantTransactions(tenantId: string) {
    const local = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, ownerType: 'MERCHANT' },
    });
    if (!local) throw new NotFoundException('المحفظة غير مفعّلة');

    const wallet = await this.client.userWallet(local.settlePayWalletId);
    return {
      total: wallet.total || 0,
      transactions: wallet.balance || [],
    };
  }

  // =====================================================================
  // CUSTOMER WALLET SETUP (OTP-based)
  // =====================================================================

  /**
   * Step 1: Initiate customer wallet setup.
   * Sends SMS OTP to the customer's WhatsApp phone number.
   */
  async initCustomerSetup(tenantId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');

    // Check existing
    const existing = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId, ownerType: 'CUSTOMER' },
    });
    if (existing) throw new BadRequestException('العميل لديه محفظة بالفعل');

    // Send OTP
    const result = await this.client.loginUser(
      contact.phone,
      contact.name || contact.phone,
      contact.nameAr || '',
      contact.email || undefined,
    );

    this.logger.log(`OTP sent to customer ${contact.phone}, uid: ${result.uid}`);
    return {
      message: `تم إرسال رمز التحقق إلى ${contact.phone}`,
      uid: result.uid,
      phone: contact.phone,
      contactId,
    };
  }

  /**
   * Step 2: Verify customer OTP and create the wallet mapping.
   */
  async verifyCustomerOtp(tenantId: string, contactId: string, mobile: string, otp: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId },
    });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');

    // Verify OTP — isProvider=false for customers
    const authResult = await this.client.authUser(mobile, otp, false);

    // Store wallet mapping
    const localWallet = await this.prisma.settlePayWallet.create({
      data: {
        tenantId,
        contactId,
        ownerType: 'CUSTOMER',
        settlePayMemberId: authResult.user.uid,
        settlePayWalletId: authResult.userToken, // userToken acts as wallet identifier
        walletType: 'MAIN',
        currency: 'EGP',
        label: `محفظة ${contact.nameAr || contact.name || contact.phone}`,
      },
    });

    this.logger.log(`Customer wallet verified for ${contact.phone}`);
    return localWallet;
  }

  /**
   * Get customer wallet with live balance.
   */
  async getCustomerWallet(tenantId: string, contactId: string) {
    const local = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId, ownerType: 'CUSTOMER' },
    });
    if (!local) return null;

    try {
      const wallet = await this.client.userWallet(local.settlePayWalletId);
      return { ...local, balance: wallet.total || 0, transactions: wallet.balance || [] };
    } catch {
      return { ...local, balance: 0, transactions: [] };
    }
  }

  /**
   * Get customer payment requests.
   */
  async getCustomerTransactions(tenantId: string, contactId: string) {
    const local = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId, ownerType: 'CUSTOMER' },
    });
    if (!local) throw new NotFoundException('العميل ليس لديه محفظة');

    const [wallet, requests] = await Promise.all([
      this.client.userWallet(local.settlePayWalletId),
      this.client.userPaymentRequests(local.settlePayWalletId),
    ]);

    return {
      balance: wallet.total || 0,
      transactions: wallet.balance || [],
      paymentRequests: requests || [],
    };
  }

  /**
   * Top up a customer's wallet. Returns an iframeUrl for the payment gateway.
   * The customer opens the iframe to pay via Fawry/Card/etc.
   */
  async topUpCustomerWallet(tenantId: string, contactId: string, amount: number) {
    const local = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId, ownerType: 'CUSTOMER' },
    });
    if (!local) throw new NotFoundException('العميل ليس لديه محفظة');

    const result = await this.client.topupWalletUser(local.settlePayWalletId, amount);
    return {
      uid: result.uid,
      iframeUrl: result.iframeUrl,
      amount,
      message: 'يرجى إتمام الدفع عبر الرابط',
    };
  }

  // =====================================================================
  // PAYMENT — Customer pays merchant via HealthPay
  // =====================================================================

  /**
   * Pay an order by deducting from the customer's HealthPay wallet.
   * Uses deductFromUser which is a merchant-initiated deduction.
   */
  async payWithWallet(tenantId: string, orderId: string, customerContactId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { contact: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.paymentStatus === 'COMPLETED') throw new BadRequestException('الطلب مدفوع بالفعل');

    // Get customer wallet (contains userToken)
    const customerWallet = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId: customerContactId, ownerType: 'CUSTOMER' },
    });
    if (!customerWallet) throw new BadRequestException('العميل ليس لديه محفظة SettlePay');

    // Check customer balance first
    try {
      const wallet = await this.client.userWallet(customerWallet.settlePayWalletId);
      if ((wallet.total || 0) < order.total) {
        throw new BadRequestException(
          `رصيد المحفظة غير كافي. المتاح: ${wallet.total} ج.م، المطلوب: ${order.total} ج.م`,
        );
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Balance check failed, proceeding with deduction: ${err.message}`);
    }

    // Deduct from customer wallet (merchant-initiated)
    const deductResult = await this.client.deductFromUser(
      customerWallet.settlePayWalletId,
      order.total,
      `دفع طلب رقم ${order.orderNumber}`,
    );

    if (!deductResult.isSuccess) {
      throw new BadRequestException('فشل خصم المبلغ من محفظة العميل — قد يكون الرصيد غير كافي');
    }

    // Record payment in WasslChat
    const tx = await this.prisma.paymentTransaction.create({
      data: {
        tenantId,
        orderId,
        method: 'HEALTHPAY',
        amount: order.total,
        currency: 'EGP',
        status: 'COMPLETED',
        gatewayRef: `hp_deduct_${Date.now()}`,
        healthpayTxId: `hp_deduct_${Date.now()}`,
        gatewayResponse: deductResult,
        paidAt: new Date(),
      },
    });

    // Update order
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: 'HEALTHPAY',
        paymentStatus: 'COMPLETED',
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // Fire events
    await this.events.onPaymentCompleted(tenantId, tx);

    this.logger.log(`Wallet payment completed: ${order.orderNumber} — ${order.total} EGP`);
    return { transaction: tx, success: true };
  }

  /**
   * Send a payment request to a customer.
   * The customer receives a push notification and the amount is
   * auto-deducted from their wallet when they accept.
   */
  async sendPaymentRequest(tenantId: string, orderId: string, customerContactId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { contact: true },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود');

    const customerWallet = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId: customerContactId, ownerType: 'CUSTOMER' },
    });
    if (!customerWallet) throw new BadRequestException('العميل ليس لديه محفظة SettlePay');

    const result = await this.client.sendPaymentRequest(
      customerWallet.settlePayWalletId,
      order.total,
    );

    if (!result.isSuccess) {
      throw new BadRequestException('فشل إرسال طلب الدفع');
    }

    this.logger.log(`Payment request sent for order ${order.orderNumber}: ${order.total} EGP`);
    return {
      success: true,
      message: `تم إرسال طلب دفع بقيمة ${order.total} ج.م للعميل`,
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Refund — transfer from merchant wallet to customer wallet.
   * Uses payToUser (merchant→user direction).
   */
  async refundToCustomer(tenantId: string, contactId: string, amount: number, description: string) {
    const customerWallet = await this.prisma.settlePayWallet.findFirst({
      where: { tenantId, contactId, ownerType: 'CUSTOMER' },
    });
    if (!customerWallet) throw new BadRequestException('العميل ليس لديه محفظة SettlePay');

    const result = await this.client.payToUser(
      customerWallet.settlePayWalletId,
      amount,
      description,
    );

    if (!result.isSuccess) {
      throw new BadRequestException('فشل تحويل المبلغ للعميل');
    }

    this.logger.log(`Refund of ${amount} EGP sent to customer ${contactId}`);
    return { success: true, amount, description };
  }

  // =====================================================================
  // ADMIN — List all wallets for a tenant
  // =====================================================================

  async listWallets(tenantId: string, ownerType?: string) {
    const where: any = { tenantId };
    if (ownerType) where.ownerType = ownerType;

    const wallets = await this.prisma.settlePayWallet.findMany({
      where,
      include: { contact: { select: { name: true, nameAr: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with remote balances
    const enriched = await Promise.all(wallets.map(async (w) => {
      try {
        const remote = await this.client.userWallet(w.settlePayWalletId);
        return { ...w, balance: remote.total || 0 };
      } catch {
        return { ...w, balance: 0 };
      }
    }));

    return enriched;
  }
}
