import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string, period: string = 'month') {
    const now = new Date();
    const periodStart = new Date(now);
    if (period === 'day') periodStart.setDate(now.getDate() - 1);
    else if (period === 'week') periodStart.setDate(now.getDate() - 7);
    else periodStart.setMonth(now.getMonth() - 1);

    const dateFilter = { gte: periodStart };

    const [totalOrders, completedOrders, revenue, newContacts, conversations, openConversations, totalProducts] = await Promise.all([
      this.prisma.order.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.order.count({ where: { tenantId, status: 'DELIVERED', createdAt: dateFilter } }),
      this.prisma.order.aggregate({ where: { tenantId, paymentStatus: 'COMPLETED', createdAt: dateFilter }, _sum: { total: true } }),
      this.prisma.contact.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.conversation.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
    ]);

    return {
      period, periodStart: periodStart.toISOString(),
      orders: { total: totalOrders, completed: completedOrders, conversionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0 },
      revenue: { total: revenue._sum.total || 0, currency: 'EGP' },
      contacts: { new: newContacts },
      conversations: { total: conversations, open: openConversations },
      products: { active: totalProducts },
    };
  }

  async getSalesReport(tenantId: string, from: string, to: string) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId, createdAt: { gte: new Date(from), lte: new Date(to) }, paymentStatus: 'COMPLETED' },
      include: { items: { include: { product: { select: { name: true, nameAr: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    const total = orders.reduce((s, o) => s + o.total, 0);
    return { orders, summary: { count: orders.length, total, currency: 'EGP', averageOrder: orders.length > 0 ? total / orders.length : 0 } };
  }

  async getTopProducts(tenantId: string, limit = 10) {
    const items = await this.prisma.orderItem.groupBy({
      by: ['productId'], where: { order: { tenantId, paymentStatus: 'COMPLETED' } },
      _sum: { quantity: true, totalPrice: true }, _count: true, orderBy: { _sum: { totalPrice: 'desc' } }, take: limit,
    });
    const productIds = items.map(i => i.productId);
    const products = await this.prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, nameAr: true, price: true, images: true } });
    const productMap = new Map(products.map(p => [p.id, p]));
    return items.map(i => ({ product: productMap.get(i.productId), totalSold: i._sum.quantity, totalRevenue: i._sum.totalPrice, orderCount: i._count }));
  }

  async getCustomerInsights(tenantId: string) {
    const [total, withOrders, topSpenders] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId, totalOrders: { gt: 0 } } }),
      this.prisma.contact.findMany({ where: { tenantId, totalOrders: { gt: 0 } }, orderBy: { totalSpent: 'desc' }, take: 10, select: { id: true, name: true, nameAr: true, phone: true, totalOrders: true, totalSpent: true } }),
    ]);
    return { total, withOrders, conversionRate: total > 0 ? ((withOrders / total) * 100).toFixed(1) : 0, topSpenders };
  }

  async getConversationAnalytics(tenantId: string, period: string = 'month') {
    const now = new Date();
    const start = new Date(now);
    if (period === 'day') start.setDate(now.getDate() - 1);
    else if (period === 'week') start.setDate(now.getDate() - 7);
    else start.setMonth(now.getMonth() - 1);

    const [total, open, resolved, messages, avgResponseMs] = await Promise.all([
      this.prisma.conversation.count({ where: { tenantId, createdAt: { gte: start } } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'RESOLVED', resolvedAt: { gte: start } } }),
      this.prisma.message.count({ where: { conversation: { tenantId }, createdAt: { gte: start } } }),
      // Simplified avg response time (in production: calculate from message pairs)
      this.prisma.message.count({ where: { conversation: { tenantId }, direction: 'OUTBOUND', createdAt: { gte: start } } }),
    ]);
    const agentPerformance = await this.prisma.conversation.groupBy({
      by: ['assigneeId'], where: { tenantId, resolvedAt: { gte: start } },
      _count: true, orderBy: { _count: { assigneeId: 'desc' } }, take: 10,
    });
    return {
      period, conversations: { total, open, resolved, resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(1) : 0 },
      messages: { total: messages, outbound: avgResponseMs },
      agentPerformance: agentPerformance.map(a => ({ assigneeId: a.assigneeId, resolvedCount: a._count })),
    };
  }
}
