import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    private prisma: PrismaService,
    private events: EventBusService,
    private coupons: CouponsService,
  ) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string; contactId?: string; sortBy?: string; sortOrder?: string }) {
    const { page = 1, limit = 20, status, contactId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (contactId) where.contactId = contactId;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({ where, include: { contact: { select: { id: true, name: true, phone: true } }, items: true, _count: { select: { payments: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.order.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const o = await this.prisma.order.findFirst({ where: { id, tenantId }, include: { contact: true, items: { include: { product: true } }, payments: true, notes: { include: { user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' } } } });
    if (!o) throw new NotFoundException('الطلب غير موجود');
    return o;
  }

  async create(tenantId: string, dto: { contactId: string; items: { productId: string; variantId?: string; quantity: number }[]; paymentMethod?: any; shippingAddress?: any; customerNotes?: string; couponCode?: string }, userId?: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: dto.contactId, tenantId } });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');

    // Validate coupon before entering transaction
    let discount = 0;
    let couponValid = false;
    if (dto.couponCode) {
      const productIds = dto.items.map(i => i.productId);
      const products = await this.prisma.product.findMany({ where: { id: { in: productIds }, tenantId } });
      const productMap = new Map(products.map(p => [p.id, p]));
      let subtotalPreview = 0;
      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (product) subtotalPreview += product.price * item.quantity;
      }
      try {
        const validation = await this.coupons.validate(tenantId, dto.couponCode, subtotalPreview);
        discount = validation.discount;
        couponValid = true;
      } catch (err) {
        // Re-throw coupon errors so the caller knows the coupon is invalid
        throw new BadRequestException(`كوبون غير صالح: ${(err as any)?.message || err}`);
      }
    }

    // Use a transaction to prevent inventory race conditions
    const { order, lowStockProducts } = await this.prisma.$transaction(async (tx) => {
      const productIds = dto.items.map(i => i.productId);

      // Lock rows for update to prevent concurrent overselling
      const products = await tx.$queryRaw<any[]>`
        SELECT * FROM "Product"
        WHERE id = ANY(${productIds}::uuid[])
          AND "tenantId" = ${tenantId}
        FOR UPDATE
      `;
      const productMap = new Map(products.map((p: any) => [p.id, p]));

      let subtotal = 0;
      const orderItems = dto.items.map(item => {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException(`المنتج غير موجود: ${item.productId}`);
        if (product.trackInventory && product.inventoryQuantity < item.quantity) {
          throw new BadRequestException(`الكمية غير متوفرة لـ ${product.nameAr || product.name} (المتبقي: ${product.inventoryQuantity})`);
        }
        const totalPrice = product.price * item.quantity;
        subtotal += totalPrice;
        return { productId: item.productId, variantId: item.variantId, name: product.name, nameAr: product.nameAr, sku: product.sku, quantity: item.quantity, unitPrice: product.price, totalPrice };
      });

      const total = subtotal - discount;
      const orderNumber = `WC-${Date.now().toString(36).toUpperCase()}`;

      const order = await tx.order.create({
        data: {
          tenantId, contactId: dto.contactId, orderNumber, subtotal, discount, total,
          paymentMethod: dto.paymentMethod, shippingAddress: dto.shippingAddress,
          customerNotes: dto.customerNotes, items: { create: orderItems },
        },
        include: { contact: true, items: true },
      });

      // Update contact stats
      await tx.contact.update({
        where: { id: dto.contactId },
        data: { totalOrders: { increment: 1 }, totalSpent: { increment: total }, lastOrderAt: new Date() },
      });

      // Decrement inventory atomically and collect low-stock products
      const lowStockProducts: any[] = [];
      for (const item of dto.items) {
        const updated = await tx.product.update({
          where: { id: item.productId },
          data: { inventoryQuantity: { decrement: item.quantity } },
        });
        if (updated.trackInventory && updated.inventoryQuantity <= updated.lowStockThreshold) {
          lowStockProducts.push(updated);
        }
      }

      return { order, lowStockProducts };
    });

    // Redeem coupon after successful transaction
    if (couponValid && dto.couponCode) {
      try { await this.coupons.redeem(tenantId, dto.couponCode); } catch (err) { this.logger.warn(`Coupon redeem failed post-order: ${err}`); }
    }

    // Fire low-stock events outside the transaction
    for (const product of lowStockProducts) {
      await this.events.onLowStock(tenantId, product);
    }

    await this.events.onOrderCreated(tenantId, order, userId);
    return order;
  }

  async updateStatus(tenantId: string, id: string, status: string, userId?: string) {
    const order = await this.findById(tenantId, id);
    const oldStatus = order.status;
    const now = new Date();
    const timestamps: any = {};
    if (status === 'CONFIRMED') timestamps.confirmedAt = now;
    if (status === 'SHIPPED') timestamps.shippedAt = now;
    if (status === 'DELIVERED') timestamps.deliveredAt = now;
    if (status === 'CANCELLED') timestamps.cancelledAt = now;

    const updated = await this.prisma.order.update({ where: { id }, data: { status: status as any, ...timestamps }, include: { contact: true, items: true } });

    await this.events.onOrderStatusChanged(tenantId, updated, oldStatus, status, userId);
    return updated;
  }

  async update(tenantId: string, id: string, dto: { shippingAddress?: any; customerNotes?: string; internalNotes?: string }) {
    await this.findById(tenantId, id);
    return this.prisma.order.update({ where: { id }, data: dto, include: { contact: true, items: true } });
  }

  async addNote(tenantId: string, orderId: string, userId: string, content: string, isPublic = false) {
    await this.findById(tenantId, orderId);
    return this.prisma.orderNote.create({ data: { orderId, userId, content, isPublic } });
  }

  async exportCsv(tenantId: string, query: { status?: string; from?: string; to?: string }) {
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) { where.createdAt = {}; if (query.from) where.createdAt.gte = new Date(query.from); if (query.to) where.createdAt.lte = new Date(query.to); }
    const orders = await this.prisma.order.findMany({ where, include: { contact: { select: { name: true, phone: true } }, items: true }, orderBy: { createdAt: 'desc' } });
    const header = 'رقم الطلب,العميل,الهاتف,الإجمالي,الخصم,الحالة,الدفع,التاريخ';
    const rows = orders.map(o => `${o.orderNumber},${o.contact.name},${o.contact.phone},${o.total},${o.discount},${o.status},${o.paymentMethod || '-'},${o.createdAt.toISOString().split('T')[0]}`);
    return { csv: [header, ...rows].join('\n'), count: orders.length };
  }
}
