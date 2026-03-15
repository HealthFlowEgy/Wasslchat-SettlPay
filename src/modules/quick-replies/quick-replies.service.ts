import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class QuickRepliesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, category?: string) {
    const where: any = { tenantId };
    if (category) where.category = category;
    return this.prisma.quickReply.findMany({ where, orderBy: { shortcut: 'asc' } });
  }

  async findByShortcut(tenantId: string, shortcut: string) {
    return this.prisma.quickReply.findFirst({ where: { tenantId, shortcut } });
  }

  async create(tenantId: string, dto: { shortcut: string; content: string; contentAr?: string; category?: string }) {
    const existing = await this.prisma.quickReply.findFirst({ where: { tenantId, shortcut: dto.shortcut } });
    if (existing) throw new ConflictException('الاختصار مستخدم بالفعل');
    return this.prisma.quickReply.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    const qr = await this.prisma.quickReply.findFirst({ where: { id, tenantId } });
    if (!qr) throw new NotFoundException('الرد السريع غير موجود');
    return this.prisma.quickReply.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const qr = await this.prisma.quickReply.findFirst({ where: { id, tenantId } });
    if (!qr) throw new NotFoundException('الرد السريع غير موجود');
    return this.prisma.quickReply.delete({ where: { id } });
  }
}
