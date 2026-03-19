import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';

const ALLOWED_CONDITION_FIELDS = new Set([
  'total', 'status', 'contactId', 'source', 'governorate', 'tag',
  'quantity', 'phone', 'text', 'conversationId', 'orderId', 'productId',
]);

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
    private notifications: NotificationsService,
  ) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; event?: string } = {}) {
    const { page = 1, limit = 20, event } = query;
    const where: any = { tenantId };
    if (event) where.event = event;
    const [data, total] = await Promise.all([
      this.prisma.automationRule.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.automationRule.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { name: string; event: string; conditions: any; actions: any }) {
    return this.prisma.automationRule.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: { name?: string; event?: string; conditions?: any[]; actions?: any[]; isActive?: boolean }) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('القاعدة غير موجودة');
    return this.prisma.automationRule.update({ where: { id }, data: dto });
  }

  async toggle(tenantId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('القاعدة غير موجودة');
    return this.prisma.automationRule.update({ where: { id }, data: { isActive: !rule.isActive } });
  }

  async delete(tenantId: string, id: string) {
    const rule = await this.prisma.automationRule.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('القاعدة غير موجودة');
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async executeRules(tenantId: string, event: string, context: any) {
    const rules = await this.prisma.automationRule.findMany({ where: { tenantId, event, isActive: true } });
    for (const rule of rules) {
      try {
        if (this.matchConditions(rule.conditions as any[], context)) {
          await this.executeActions(tenantId, rule.actions as any[], context);
          await this.prisma.automationRule.update({ where: { id: rule.id }, data: { executionCount: { increment: 1 } } });
        }
      } catch (err) {
        this.logger.error(`Automation rule ${rule.id} (${rule.name}) failed: ${err}`);
      }
    }
  }

  private matchConditions(conditions: any[], context: any): boolean {
    if (!conditions?.length) return true;
    return conditions.every(c => {
      // Only allow a whitelist of safe field names to prevent accessing private context keys
      if (!ALLOWED_CONDITION_FIELDS.has(c.field)) return false;
      const value = context[c.field];
      switch (c.operator) {
        case 'equals': return String(value) === String(c.value);
        case 'not_equals': return String(value) !== String(c.value);
        case 'contains': return String(value).toLowerCase().includes(String(c.value).toLowerCase());
        case 'greater_than': return Number(value) > Number(c.value);
        case 'less_than': return Number(value) < Number(c.value);
        default: return false;
      }
    });
  }

  private async executeActions(tenantId: string, actions: any[], context: any) {
    for (const action of actions) {
      this.logger.log(`Executing automation action "${action.type}" for tenant ${tenantId}`);
      try {
        switch (action.type) {
          case 'send_whatsapp_message': {
            // Requires: action.phone (or resolved from context) and action.message
            const phone = action.phone || context.phone;
            if (phone && action.message) {
              await this.whatsapp.sendText(tenantId, phone, action.message);
            }
            break;
          }
          case 'add_tag': {
            // Requires: context.contactId and action.tagId
            if (context.contactId && action.tagId) {
              await this.prisma.contactTag.upsert({
                where: { contactId_tagId: { contactId: context.contactId, tagId: action.tagId } },
                create: { contactId: context.contactId, tagId: action.tagId },
                update: {},
              });
            }
            break;
          }
          case 'assign_conversation': {
            // Requires: context.conversationId and action.assigneeId
            if (context.conversationId && action.assigneeId) {
              await this.prisma.conversation.update({
                where: { id: context.conversationId },
                data: { assigneeId: action.assigneeId },
              });
            }
            break;
          }
          case 'create_notification': {
            await this.notifications.notify(
              tenantId, action.notificationType || 'SYSTEM_ALERT',
              action.title || 'تنبيه تلقائي', action.titleAr || 'تنبيه تلقائي',
              action.body || JSON.stringify(context), action.bodyAr || '',
              context,
            );
            break;
          }
          case 'update_order_status': {
            if (context.orderId && action.status) {
              await this.prisma.order.update({
                where: { id: context.orderId },
                data: { status: action.status },
              });
            }
            break;
          }
          default:
            this.logger.warn(`Unknown automation action type: "${action.type}" — skipping`);
        }
      } catch (err) {
        this.logger.error(`Action "${action.type}" failed: ${err}`);
        // Continue executing remaining actions even if one fails
      }
    }
  }
}
