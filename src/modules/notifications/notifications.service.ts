import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string, query: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const { unreadOnly, page = 1, limit = 20 } = query;
    const where: any = { tenantId, OR: [{ userId }, { userId: null }] };
    if (unreadOnly) where.isRead = false;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { tenantId, OR: [{ userId }, { userId: null }], isRead: false } }),
    ]);
    return { data, unreadCount, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { userId?: string; type: string; title: string; titleAr?: string; body: string; bodyAr?: string; data?: any }) {
    return this.prisma.notification.create({ data: { ...dto, tenantId, type: dto.type as any } });
  }

  async markAsRead(tenantId: string, userId: string, id: string) {
    return this.prisma.notification.updateMany({ where: { id, tenantId, OR: [{ userId }, { userId: null }] }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllAsRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { tenantId, OR: [{ userId }, { userId: null }], isRead: false }, data: { isRead: true, readAt: new Date() } });
  }

  async delete(tenantId: string, id: string) {
    return this.prisma.notification.deleteMany({ where: { id, tenantId } });
  }

  // Helper for other modules to create notifications
  async notify(tenantId: string, type: string, title: string, titleAr: string, body: string, bodyAr: string, data?: any, userId?: string) {
    return this.create(tenantId, { userId, type, title, titleAr, body, bodyAr, data });
  }
}
