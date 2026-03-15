import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string; source?: string; sortBy?: string; sortOrder?: string }) {
    const { page = 1, limit = 20, search, source, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = { tenantId };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { nameAr: { contains: search } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }];
    if (source) where.source = source;

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({ where, include: { contactTags: { include: { tag: true } }, _count: { select: { orders: true, conversations: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.contact.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const c = await this.prisma.contact.findFirst({ where: { id, tenantId }, include: { contactTags: { include: { tag: true } }, orders: { take: 5, orderBy: { createdAt: 'desc' } }, conversations: { take: 5, orderBy: { updatedAt: 'desc' } } } });
    if (!c) throw new NotFoundException('جهة الاتصال غير موجودة');
    return c;
  }

  async findOrCreateByPhone(tenantId: string, phone: string, data?: { name?: string; whatsappId?: string }) {
    let contact = await this.prisma.contact.findFirst({ where: { tenantId, phone } });
    if (!contact) {
      contact = await this.prisma.contact.create({ data: { tenantId, phone, name: data?.name, whatsappId: data?.whatsappId, source: 'WHATSAPP' } });
    }
    return contact;
  }

  async create(tenantId: string, dto: any) {
    return this.prisma.contact.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findById(tenantId, id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  async addTag(tenantId: string, contactId: string, tagId: string) {
    return this.prisma.contactTag.create({ data: { contactId, tagId } });
  }

  async removeTag(contactId: string, tagId: string) {
    return this.prisma.contactTag.delete({ where: { contactId_tagId: { contactId, tagId } } });
  }

  async block(tenantId: string, id: string) {
    return this.prisma.contact.update({ where: { id }, data: { isBlocked: true } });
  }

  async unblock(tenantId: string, id: string) {
    return this.prisma.contact.update({ where: { id }, data: { isBlocked: false } });
  }

  async importFromCsv(tenantId: string, csvData: string) {
    const lines = csvData.split('\n').filter(l => l.trim());
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const phoneIdx = header.findIndex(h => h.includes('phone') || h.includes('هاتف'));
    const nameIdx = header.findIndex(h => h.includes('name') || h.includes('اسم'));
    const emailIdx = header.findIndex(h => h.includes('email') || h.includes('بريد'));

    if (phoneIdx === -1) throw new Error('CSV must have a phone column');

    let imported = 0, skipped = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const phone = cols[phoneIdx]?.replace(/[^0-9]/g, '');
      if (!phone) { skipped++; continue; }
      try {
        await this.prisma.contact.upsert({
          where: { tenantId_phone: { tenantId, phone } },
          create: { tenantId, phone, name: nameIdx >= 0 ? cols[nameIdx] : undefined, email: emailIdx >= 0 ? cols[emailIdx] : undefined, source: 'IMPORT' },
          update: {},
        });
        imported++;
      } catch { skipped++; }
    }
    return { imported, skipped, total: lines.length - 1 };
  }

  async exportCsv(tenantId: string) {
    const contacts = await this.prisma.contact.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    const header = 'الاسم,الهاتف,البريد,المدينة,المحافظة,الطلبات,الإنفاق,المصدر,التاريخ';
    const rows = contacts.map(c => `${c.name || ''},${c.phone},${c.email || ''},${c.city || ''},${c.governorate || ''},${c.totalOrders},${c.totalSpent},${c.source},${c.createdAt.toISOString().split('T')[0]}`);
    return { csv: [header, ...rows].join('\n'), count: contacts.length };
  }
}
