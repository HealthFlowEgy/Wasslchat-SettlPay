import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id }, include: { plan: true } });
    if (!t) throw new NotFoundException('المنشأة غير موجودة');
    return t;
  }

  async update(id: string, dto: Record<string, unknown>) {
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async getStats(tenantId: string) {
    const [products, orders, contacts, conversations, revenue] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.order.count({ where: { tenantId } }),
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.order.aggregate({ where: { tenantId, paymentStatus: 'COMPLETED' }, _sum: { total: true } }),
    ]);
    return { products, orders, contacts, openConversations: conversations, totalRevenue: revenue._sum.total || 0 };
  }

  async getSettings(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
    return t?.settings || {};
  }

  async updateSettings(tenantId: string, settings: any) {
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { settings } });
  }
}
