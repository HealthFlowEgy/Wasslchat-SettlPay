import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { includeInactive?: boolean; page?: number; limit?: number } = {}) {
    const { includeInactive = false, page = 1, limit = 50 } = query;
    const where: any = { tenantId };
    if (!includeInactive) where.isActive = true;
    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where, include: { children: true, _count: { select: { products: true } } },
        orderBy: { sortOrder: 'asc' }, skip: (page - 1) * limit, take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const c = await this.prisma.category.findFirst({ where: { id, tenantId }, include: { children: true, products: { take: 10 } } });
    if (!c) throw new NotFoundException('التصنيف غير موجود');
    return c;
  }

  async create(tenantId: string, dto: { name: string; nameAr?: string; description?: string; parentId?: string; image?: string }) {
    const slug = slugify(dto.name, { lower: true }) + '-' + Date.now().toString(36);
    return this.prisma.category.create({ data: { ...dto, tenantId, slug } });
  }

  async update(tenantId: string, id: string, dto: Partial<{ name: string; nameAr: string; description: string; image: string; isActive: boolean }>) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('التصنيف غير موجود');
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  async reorder(tenantId: string, items: { id: string; sortOrder: number }[]) {
    await Promise.all(items.map(item =>
      this.prisma.category.updateMany({ where: { id: item.id, tenantId }, data: { sortOrder: item.sortOrder } })
    ));
    return this.findAll(tenantId);
  }
}
