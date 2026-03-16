import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EventBusService } from '../../common/events/event-bus.service';

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private events: EventBusService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.broadcast.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
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

    // Fire EventBus completion event — triggers notifications + external webhooks
    await this.events.onBroadcastCompleted(tenantId, completed);

    return completed;
  }

  async cancel(tenantId: string, id: string) {
    return this.prisma.broadcast.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async update(tenantId: string, id: string, dto: any) {
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
}
