import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService, private ai: AiService) {}

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

  async create(tenantId: string, dto: CreateContactDto) {
    return this.prisma.contact.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpdateContactDto) {
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

  /** Merge duplicate contacts — keeps primary, moves orders/conversations, deletes secondary */
  async merge(tenantId: string, primaryId: string, secondaryId: string) {
    const [primary, secondary] = await Promise.all([
      this.prisma.contact.findFirst({ where: { id: primaryId, tenantId } }),
      this.prisma.contact.findFirst({ where: { id: secondaryId, tenantId } }),
    ]);
    if (!primary) throw new NotFoundException('جهة الاتصال الأساسية غير موجودة');
    if (!secondary) throw new NotFoundException('جهة الاتصال المكررة غير موجودة');
    // Move all secondary's data to primary
    await this.prisma.$transaction([
      this.prisma.order.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } }),
      this.prisma.conversation.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } }),
      this.prisma.contactTag.updateMany({ where: { contactId: secondaryId }, data: { contactId: primaryId } }),
      // Merge stats
      this.prisma.contact.update({
        where: { id: primaryId },
        data: {
          totalOrders: primary.totalOrders + secondary.totalOrders,
          totalSpent: primary.totalSpent + secondary.totalSpent,
          email: primary.email || secondary.email,
          name: primary.name || secondary.name,
          nameAr: primary.nameAr || secondary.nameAr,
          address: primary.address || secondary.address,
          city: primary.city || secondary.city,
          notes: [primary.notes, secondary.notes, `[دمج مع ${secondary.phone}]`].filter(Boolean).join(' | '),
        },
      }),
      // Soft-delete secondary
      this.prisma.contact.update({ where: { id: secondaryId }, data: { isBlocked: true, notes: `[مدمج مع ${primary.phone}]` } }),
    ]);
    return this.prisma.contact.findFirst({ where: { id: primaryId }, include: { _count: { select: { orders: true, conversations: true } } } });
  }

  /** Compute RFM-based engagement score (0-100) for a single contact */
  async getEngagementScore(tenantId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, tenantId },
      select: { totalOrders: true, totalSpent: true, lastOrderAt: true },
    });
    if (!contact) throw new NotFoundException('جهة الاتصال غير موجودة');
    const score = this.ai.computeEngagementScore(contact);
    return { contactId: id, score };
  }

  /** Find potential duplicates by phone similarity */
  async findDuplicates(tenantId: string) {
    const contacts = await this.prisma.contact.findMany({ where: { tenantId, isBlocked: false }, select: { id: true, name: true, phone: true, email: true, totalOrders: true } });
    const dupes: { primary: any; secondary: any; reason: string }[] = [];
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const a = contacts[i], b = contacts[j];
        const phoneA = a.phone.replace(/[\s\-\+]/g, '').slice(-10);
        const phoneB = b.phone.replace(/[\s\-\+]/g, '').slice(-10);
        if (phoneA === phoneB) dupes.push({ primary: a, secondary: b, reason: 'نفس رقم الهاتف' });
        else if (a.email && a.email === b.email) dupes.push({ primary: a, secondary: b, reason: 'نفس البريد الإلكتروني' });
      }
    }
    return dupes;
  }
}
