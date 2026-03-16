import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 50, search } = query;
    const where: any = { tenantId };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    const [data, total] = await Promise.all([
      this.prisma.tag.findMany({ where, include: { _count: { select: { contacts: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.tag.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async create(tenantId: string, dto: { name: string; nameAr?: string; color?: string }) {
    const existing = await this.prisma.tag.findFirst({ where: { tenantId, name: dto.name } });
    if (existing) throw new ConflictException('التاج موجود بالفعل');
    return this.prisma.tag.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: { name?: string; nameAr?: string; color?: string }) {
    const tag = await this.prisma.tag.findFirst({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('التاج غير موجود');
    return this.prisma.tag.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, tenantId } });
    if (!tag) throw new NotFoundException('التاج غير موجود');
    await this.prisma.contactTag.deleteMany({ where: { tagId: id } });
    return this.prisma.tag.delete({ where: { id } });
  }
}
