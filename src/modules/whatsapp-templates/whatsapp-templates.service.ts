import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class WhatsappTemplatesService {
  private readonly logger = new Logger(WhatsappTemplatesService.name);
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async findAll(tenantId: string) {
    return this.prisma.whatsappTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async findById(tenantId: string, id: string) {
    const t = await this.prisma.whatsappTemplate.findFirst({ where: { id, tenantId } });
    if (!t) throw new NotFoundException('القالب غير موجود');
    return t;
  }

  async create(tenantId: string, dto: { name: string; language?: string; category?: string; body: string; header?: any; footer?: string; buttons?: any }) {
    return this.prisma.whatsappTemplate.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findById(tenantId, id);
    return this.prisma.whatsappTemplate.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.whatsappTemplate.delete({ where: { id } });
  }

  async submitForApproval(tenantId: string, id: string) {
    const template = await this.findById(tenantId, id);
    // In production, this would submit to WhatsApp Cloud API for approval
    this.logger.log(`Submitting template ${template.name} for approval`);
    return this.prisma.whatsappTemplate.update({ where: { id }, data: { status: 'PENDING' } });
  }

  async syncFromCloudApi(tenantId: string) {
    // In production, this would fetch approved templates from WhatsApp Cloud API
    this.logger.log(`Syncing templates from Cloud API for tenant ${tenantId}`);
    return { synced: 0, message: 'Cloud API sync not configured. Configure WHATSAPP_CLOUD_TOKEN in .env' };
  }
}
