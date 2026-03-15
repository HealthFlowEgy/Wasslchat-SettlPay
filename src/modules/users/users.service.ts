import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, firstName: true, lastName: true, firstNameAr: true, lastNameAr: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    });
  }

  async findById(tenantId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('المستخدم غير موجود');
    const { passwordHash, refreshToken, ...result } = u;
    return result;
  }

  async create(tenantId: string, dto: { email: string; password: string; firstName: string; lastName: string; role?: any; phone?: string }) {
    const existing = await this.prisma.user.findFirst({ where: { tenantId, email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مسجل بالفعل');
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: { tenantId, email: dto.email, passwordHash: hash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone, role: dto.role || 'AGENT' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
  }

  async update(tenantId: string, id: string, dto: any) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: { isActive: false } });
  }
}
