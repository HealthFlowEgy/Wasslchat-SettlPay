import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; event?: string } = {}) {
    const { page = 1, limit = 20, event } = query;
    const where: any = { tenantId };
    if (event) where.event = event;
    const [data, total] = await Promise.all([
      this.prisma.automationRule.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
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

  // Execute matching rules for an event
  async executeRules(tenantId: string, event: string, context: any) {
    const rules = await this.prisma.automationRule.findMany({ where: { tenantId, event, isActive: true } });
    for (const rule of rules) {
      try {
        if (this.matchConditions(rule.conditions as any[], context)) {
          await this.executeActions(tenantId, rule.actions as any[], context);
          await this.prisma.automationRule.update({ where: { id: rule.id }, data: { executionCount: { increment: 1 } } });
        }
      } catch (err) { this.logger.error(`Automation rule ${rule.id} failed: ${err}`); }
    }
  }

  private matchConditions(conditions: any[], context: any): boolean {
    if (!conditions?.length) return true;
    return conditions.every(c => {
      const value = context[c.field];
      switch (c.operator) {
        case 'equals': return value === c.value;
        case 'contains': return String(value).includes(c.value);
        case 'greater_than': return Number(value) > Number(c.value);
        case 'less_than': return Number(value) < Number(c.value);
        default: return false;
      }
    });
  }

  private async executeActions(tenantId: string, actions: any[], context: any) {
    for (const action of actions) {
      this.logger.log(`Executing action: ${action.type} for tenant ${tenantId}`);
      // Actions would trigger WhatsApp messages, assign conversations, tag contacts, etc.
      // Integration with other services happens here
    }
  }
}
