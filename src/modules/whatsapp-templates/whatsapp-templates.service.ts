import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhatsappTemplatesService {
  private readonly logger = new Logger(WhatsappTemplatesService.name);
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; status?: string } = {}) {
    const { page = 1, limit = 20, status } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
      this.prisma.whatsappTemplate.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.whatsappTemplate.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const t = await this.prisma.whatsappTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('القالب غير موجود');
    return t;
  }

  async create(tenantId: string, dto: { name: string; language?: string; category?: string; body: string; header?: any; footer?: string; buttons?: any }) {
    return this.prisma.whatsappTemplate.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: Partial<{ name: string; body: string; header: any; footer: string; buttons: any }>) {
    await this.findById(tenantId, id);
    return this.prisma.whatsappTemplate.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.whatsappTemplate.delete({ where: { id } });
  }

  async submitForApproval(tenantId: string, id: string) {
    const template = await this.findById(tenantId, id);
    this.logger.log(`Submitting template ${template.name} for approval`);
    return this.prisma.whatsappTemplate.update({ where: { id }, data: { status: 'PENDING' } });
  }

  async syncFromCloudApi(tenantId: string) {
    const token = this.config.get('WHATSAPP_CLOUD_TOKEN');
    if (!token) return { synced: 0, message: 'WHATSAPP_CLOUD_TOKEN not configured' };
    this.logger.log(`Syncing templates from Cloud API for tenant ${tenantId}`);
    return { synced: 0, message: 'Cloud API sync — implement with Meta Business API' };
  }
}
