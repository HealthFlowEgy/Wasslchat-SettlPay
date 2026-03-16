import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import slugify from 'slugify';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string; categoryId?: string; isFeatured?: boolean; isActive?: boolean; sortBy?: string; sortOrder?: string }) {
    const { page = 1, limit = 20, search, categoryId, isFeatured, isActive = true, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const where: any = { tenantId, isActive };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { nameAr: { contains: search } }, { sku: { contains: search, mode: 'insensitive' } }];
    if (categoryId) where.categoryId = categoryId;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: { category: { select: { id: true, name: true, nameAr: true } }, variants: true }, skip: (page - 1) * limit, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const p = await this.prisma.product.findFirst({ where: { id, tenantId }, include: { category: true, variants: true } });
    if (!p) throw new NotFoundException('المنتج غير موجود');
    return p;
  }

  async create(tenantId: string, dto: { name: string; nameAr?: string; description?: string; descriptionAr?: string; price: number; compareAtPrice?: number; costPrice?: number; sku?: string; barcode?: string; categoryId?: string; inventoryQuantity?: number; lowStockThreshold?: number; trackInventory?: boolean; isFeatured?: boolean; images?: string[] }) {
    const slug = slugify(dto.name, { lower: true }) + '-' + Date.now().toString(36);
    return this.prisma.product.create({ data: { ...dto, tenantId, slug }, include: { category: true } });
  }

  async update(tenantId: string, id: string, dto: Record<string, unknown>) {
    await this.findById(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: dto, include: { category: true, variants: true } });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async updateInventory(tenantId: string, id: string, quantity: number) {
    await this.findById(tenantId, id);
    return this.prisma.product.update({ where: { id }, data: { inventoryQuantity: quantity } });
  }

  async getLowStock(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, isActive: true, trackInventory: true, inventoryQuantity: { lte: 5 } },
    });
  }

  async bulkUpdate(tenantId: string, updates: { id: string; data: any }[]) {
    const results = await Promise.all(updates.map(u => this.prisma.product.updateMany({ where: { id: u.id, tenantId }, data: u.data })));
    return { updated: results.reduce((s, r) => s + r.count, 0), total: updates.length };
  }

  async exportCsv(tenantId: string) {
    const products = await this.prisma.product.findMany({ where: { tenantId }, include: { category: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    const header = 'الاسم,Name,SKU,التصنيف,السعر,المخزون,نشط';
    const rows = products.map(p => `${p.nameAr || ''},${p.name},${p.sku || ''},${p.category?.name || ''},${p.price},${p.inventoryQuantity},${p.isActive}`);
    return { csv: [header, ...rows].join('\n'), count: products.length };
  }
}
