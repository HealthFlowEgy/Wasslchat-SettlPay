import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: { page?: number; limit?: number; search?: string; role?: string } = {}) {
    const { page = 1, limit = 20, search, role } = query;
    const where: any = { tenantId };
    if (search) where.OR = [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    if (role) where.role = role;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: { id: true, email: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findById(tenantId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('المستخدم غير موجود');
    const { passwordHash, refreshToken, ...result } = u;
    return result;
  }

  async create(tenantId: string, dto: { email: string; password: string; firstName: string; lastName: string; role?: string; phone?: string }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مسجل بالفعل');
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { tenantId, email: dto.email, passwordHash: hash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, role: (dto.role as any) || 'AGENT' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
  }

  async update(tenantId: string, id: string, dto: { firstName?: string; lastName?: string; phone?: string; role?: string; isActive?: boolean }) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: dto as any });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
