import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string; assigneeId?: string; unreadOnly?: boolean }) {
    const { page = 1, limit = 20, status, assigneeId, unreadOnly } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (unreadOnly) where.unreadCount = { gt: 0 };

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where, include: { contact: { select: { id: true, name: true, nameAr: true, phone: true, avatar: true } }, assignee: { select: { id: true, firstName: true, lastName: true } } },
        skip: (page - 1) * limit, take: limit, orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const c = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { contact: true, assignee: { select: { id: true, firstName: true, lastName: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!c) throw new NotFoundException('المحادثة غير موجودة');
    return c;
  }

  async findOrCreateForContact(tenantId: string, contactId: string) {
    let conv = await this.prisma.conversation.findFirst({ where: { tenantId, contactId, status: { in: ['OPEN', 'PENDING'] } } });
    if (!conv) {
      conv = await this.prisma.conversation.create({ data: { tenantId, contactId, status: 'OPEN', channel: 'whatsapp' } });
    }
    return conv;
  }

  async assign(tenantId: string, id: string, assigneeId: string) {
    return this.prisma.conversation.update({ where: { id }, data: { assigneeId } });
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const data: any = { status };
    if (status === 'RESOLVED') data.resolvedAt = new Date();
    return this.prisma.conversation.update({ where: { id }, data });
  }

  async markAsRead(tenantId: string, id: string) {
    await this.prisma.message.updateMany({ where: { conversationId: id, isRead: false }, data: { isRead: true, readAt: new Date() } });
    return this.prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } });
  }
}
