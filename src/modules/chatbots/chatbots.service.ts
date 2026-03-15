import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ChatbotsService {
  private readonly logger = new Logger(ChatbotsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.chatbotFlow.findMany({ where: { tenantId }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }] });
  }

  async create(tenantId: string, dto: { name: string; nameAr?: string; trigger: string; triggerType?: string; flowData: any; typebotId?: string; n8nWorkflowId?: string }) {
    return this.prisma.chatbotFlow.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    const flow = await this.prisma.chatbotFlow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('البوت غير موجود');
    return this.prisma.chatbotFlow.update({ where: { id }, data: dto });
  }

  async toggle(tenantId: string, id: string) {
    const flow = await this.prisma.chatbotFlow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('البوت غير موجود');
    return this.prisma.chatbotFlow.update({ where: { id }, data: { status: flow.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  }

  async delete(tenantId: string, id: string) {
    const flow = await this.prisma.chatbotFlow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('البوت غير موجود');
    return this.prisma.chatbotFlow.delete({ where: { id } });
  }

  async matchTrigger(tenantId: string, message: string): Promise<any | null> {
    const flows = await this.prisma.chatbotFlow.findMany({ where: { tenantId, status: 'ACTIVE' }, orderBy: { priority: 'desc' } });
    for (const flow of flows) {
      if (flow.triggerType === 'keyword' && message.toLowerCase().includes(flow.trigger.toLowerCase())) return flow;
      if (flow.triggerType === 'regex' && new RegExp(flow.trigger, 'i').test(message)) return flow;
      if (flow.triggerType === 'starts_with' && message.toLowerCase().startsWith(flow.trigger.toLowerCase())) return flow;
    }
    return null;
  }
}
