import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Maximum regex pattern length to mitigate ReDoS via overly complex user-supplied patterns */
const MAX_REGEX_LENGTH = 200;

@Injectable()
export class ChatbotsService {
  private readonly logger = new Logger(ChatbotsService.name);
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const { page = 1, limit = 20, search, status } = query;
    const where: any = { tenantId };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { trigger: { contains: search, mode: 'insensitive' } }];
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.chatbotFlow.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.chatbotFlow.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { name: string; nameAr?: string; trigger: string; triggerType?: string; flowData: any; typebotId?: string; n8nWorkflowId?: string }) {
    if (dto.triggerType === 'regex') this.validateRegex(dto.trigger);
    return this.prisma.chatbotFlow.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: { name?: string; nameAr?: string; description?: string; trigger?: string; triggerType?: string; flowData?: any; status?: string }) {
    const flow = await this.prisma.chatbotFlow.findFirst({ where: { id, tenantId } });
    if (!flow) throw new NotFoundException('البوت غير موجود');
    const effectiveType = dto.triggerType ?? flow.triggerType;
    if (effectiveType === 'regex' && dto.trigger) this.validateRegex(dto.trigger);
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
    const lowerMsg = message.toLowerCase();
    for (const flow of flows) {
      try {
        if (flow.triggerType === 'keyword' && lowerMsg.includes(flow.trigger.toLowerCase())) return flow;
        if (flow.triggerType === 'starts_with' && lowerMsg.startsWith(flow.trigger.toLowerCase())) return flow;
        if (flow.triggerType === 'regex') {
          if (!flow.trigger || flow.trigger.length > MAX_REGEX_LENGTH) continue;
          if (new RegExp(flow.trigger, 'i').test(message)) return flow;
        }
      } catch {
        // Malformed regex persisted in DB — log and skip rather than crashing the whole chain
        this.logger.warn(`Skipping chatbot ${flow.id} — invalid regex pattern: "${flow.trigger}"`);
      }
    }
    return null;
  }

  /** Validates a user-supplied regex before persisting to prevent ReDoS at match time */
  private validateRegex(pattern: string): void {
    if (!pattern?.trim()) throw new BadRequestException('نمط Regex لا يمكن أن يكون فارغاً');
    if (pattern.length > MAX_REGEX_LENGTH) throw new BadRequestException(`نمط Regex أطول من الحد المسموح (${MAX_REGEX_LENGTH} حرف)`);
    try {
      new RegExp(pattern, 'i');
    } catch {
      throw new BadRequestException('نمط Regex غير صالح');
    }
    // Detect known catastrophic backtracking structures: (a+)+ / (a*)* / (.+)+ etc.
    if (/(\([^)]*[+*]\)[+*])/.test(pattern)) {
      throw new BadRequestException('نمط Regex يحتوي على تعبير قد يسبب تأخيراً كبيراً في المعالجة');
    }
  }
}
