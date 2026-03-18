import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventBusService } from '../../common/events/event-bus.service';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);
  constructor(private prisma: PrismaService, private whatsapp: WhatsappService, private events: EventBusService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string } = {}) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.broadcast.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { name: string; content?: string; templateName?: string; templateLang?: string; mediaUrl?: string; audience: any; scheduledAt?: string }) {
    return this.prisma.broadcast.create({ data: { ...dto, tenantId, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null } });
  }

  async send(tenantId: string, id: string) {
    const broadcast = await this.prisma.broadcast.findFirst({ where: { id, tenantId } });
    if (!broadcast) throw new NotFoundException('الحملة غير موجودة');

    // Get recipients based on audience filters
    const where: any = { tenantId, isBlocked: false };
    const audience = broadcast.audience as any;
    if (audience?.tagIds?.length) {
      where.contactTags = { some: { tagId: { in: audience.tagIds } } };
    }
    if (audience?.governorate) where.governorate = audience.governorate;

    const contacts = await this.prisma.contact.findMany({ where, select: { phone: true } });
    await this.prisma.broadcast.update({ where: { id }, data: { status: 'SENDING', totalRecipients: contacts.length, startedAt: new Date() } });

    let sent = 0, failed = 0;
    for (const contact of contacts) {
      try {
        if (broadcast.templateName) {
          await this.whatsapp.sendTemplate(tenantId, contact.phone, broadcast.templateName, []);
        } else if (broadcast.content) {
          await this.whatsapp.sendText(tenantId, contact.phone, broadcast.content);
        }
        sent++;
      } catch (err) {
        failed++;
        this.logger.error(`Broadcast send failed to ${contact.phone}: ${err}`);
      }
      // Rate limit: 1 msg per 100ms
      await new Promise(r => setTimeout(r, 100));
    }

    const completed = await this.prisma.broadcast.update({ where: { id }, data: { status: 'COMPLETED', sentCount: sent, failedCount: failed, completedAt: new Date() } });
    await this.events.onBroadcastCompleted(tenantId, completed);
    return completed;
  }

  async cancel(tenantId: string, id: string) {
    return this.prisma.broadcast.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async update(tenantId: string, id: string, dto: UpdateBroadcastDto) {
    const bc = await this.prisma.broadcast.findFirst({ where: { id, tenantId } });
    if (!bc) throw new NotFoundException('الحملة غير موجودة');
    if (bc.status !== 'DRAFT' && bc.status !== 'SCHEDULED') throw new Error('لا يمكن تعديل حملة تم إرسالها');
    return this.prisma.broadcast.update({ where: { id }, data: dto });
  }

  async duplicate(tenantId: string, id: string) {
    const bc = await this.prisma.broadcast.findFirst({ where: { id, tenantId } });
    if (!bc) throw new NotFoundException('الحملة غير موجودة');
    const { id: _, createdAt, updatedAt, startedAt, completedAt, sentCount, deliveredCount, readCount, failedCount, ...data } = bc;
    return this.prisma.broadcast.create({ data: { ...data, name: `${data.name} (نسخة)`, status: 'DRAFT', totalRecipients: 0 } });
  }

  async getStats(tenantId: string, id: string) {
    const bc = await this.prisma.broadcast.findFirst({ where: { id, tenantId } });
    if (!bc) throw new NotFoundException('الحملة غير موجودة');
    return {
      totalRecipients: bc.totalRecipients, sent: bc.sentCount, delivered: bc.deliveredCount, read: bc.readCount, failed: bc.failedCount,
      deliveryRate: bc.sentCount > 0 ? ((bc.deliveredCount / bc.sentCount) * 100).toFixed(1) : 0,
      readRate: bc.deliveredCount > 0 ? ((bc.readCount / bc.deliveredCount) * 100).toFixed(1) : 0,
    };
  }

  /**
   * Scheduled broadcast processor — called by @Cron every minute.
   * Picks up SCHEDULED broadcasts whose scheduledAt has passed.
   * Max 3 retries per campaign — after that, marks as FAILED.
   */
  async processScheduledBroadcasts() {
    const MAX_RETRIES = 3;
    const now = new Date();

    const due = await this.prisma.broadcast.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        retryCount: { lt: MAX_RETRIES },
      },
    });

    if (due.length === 0) return;
    this.logger.log(`Processing ${due.length} scheduled broadcast(s)`);

    for (const broadcast of due) {
      try {
        await this.send(broadcast.tenantId, broadcast.id);
        this.logger.log(`Scheduled broadcast sent: ${broadcast.name} (${broadcast.id})`);
      } catch (err) {
        const newRetry = broadcast.retryCount + 1;
        const newStatus = newRetry >= MAX_RETRIES ? 'FAILED' : 'SCHEDULED';

        await this.prisma.broadcast.update({
          where: { id: broadcast.id },
          data: { retryCount: newRetry, status: newStatus as any },
        });

        if (newStatus === 'FAILED') {
          this.logger.error(`Broadcast ${broadcast.name} FAILED after ${MAX_RETRIES} retries: ${err}`);
          await this.events.onBroadcastCompleted(broadcast.tenantId, {
            ...broadcast, status: 'FAILED', retryCount: newRetry,
          });
        } else {
          this.logger.warn(`Broadcast ${broadcast.name} retry ${newRetry}/${MAX_RETRIES}: ${err}`);
        }
      }
    }
  }
}
