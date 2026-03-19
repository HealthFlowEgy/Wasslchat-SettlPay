import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, includeExpired = false) {
    const where: any = { tenantId };
    if (!includeExpired) where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
    return this.prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findByCode(tenantId: string, code: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { tenantId, code: code.toUpperCase() } });
    if (!coupon) throw new NotFoundException('كود الخصم غير صالح');
    return coupon;
  }

  async create(tenantId: string, dto: { code: string; type: string; value: number; minOrderAmount?: number; maxDiscount?: number; maxUses?: number; startsAt?: string; expiresAt?: string; applicableProducts?: string[]; applicableCategories?: string[] }) {
    const existing = await this.prisma.coupon.findFirst({ where: { tenantId, code: dto.code.toUpperCase() } });
    if (existing) throw new ConflictException('كود الخصم مستخدم بالفعل');
    return this.prisma.coupon.create({ data: {
      ...dto, tenantId, code: dto.code.toUpperCase(), type: dto.type as any,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    }});
  }

  async validate(tenantId: string, code: string, orderTotal: number) {
    const coupon = await this.findByCode(tenantId, code);
    if (!coupon.isActive) throw new BadRequestException('كود الخصم غير نشط');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new BadRequestException('كود الخصم منتهي الصلاحية');
    if (coupon.startsAt && coupon.startsAt > new Date()) throw new BadRequestException('كود الخصم لم يبدأ بعد');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new BadRequestException('كود الخصم وصل للحد الأقصى من الاستخدام');
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) throw new BadRequestException(`الحد الأدنى للطلب ${coupon.minOrderAmount} ج.م`);

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = orderTotal * (coupon.value / 100);
      if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = Math.min(coupon.value, orderTotal);
    }
    return { valid: true, coupon, discount, newTotal: orderTotal - discount };
  }

  async redeem(tenantId: string, code: string) {
    const coupon = await this.findByCode(tenantId, code);
    // Atomic conditional increment: only bumps usedCount when still within the limit.
    // This prevents the race condition where two concurrent requests both pass validate()
    // and both call redeem(), causing the usage cap to be exceeded.
    const result = await this.prisma.coupon.updateMany({
      where: {
        id: coupon.id,
        isActive: true,
        OR: [
          { maxUses: null },
          { maxUses: { gt: coupon.usedCount } },
        ],
      },
      data: { usedCount: { increment: 1 } },
    });
    if (result.count === 0) {
      throw new BadRequestException('كود الخصم وصل للحد الأقصى من الاستخدام');
    }
    return result;
  }

  async update(tenantId: string, id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('كود الخصم غير موجود');
    return this.prisma.coupon.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('كود الخصم غير موجود');
    return this.prisma.coupon.delete({ where: { id } });
  }
}
