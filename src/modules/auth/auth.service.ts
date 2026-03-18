import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: {
    businessName: string; businessNameAr?: string; email: string; password: string;
    firstName: string; lastName: string; phone?: string;
  }) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email } });
    if (existing) throw new ConflictException('البريد الإلكتروني مسجل بالفعل');

    const starterPlan = await this.prisma.plan.findFirst({ where: { slug: 'starter' } });
    if (!starterPlan) throw new Error('Default plan not found. Run db:seed first.');

    const slug = dto.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.businessName,
        nameAr: dto.businessNameAr,
        slug: `${slug}-${Date.now().toString(36)}`,
        email: dto.email,
        phone: dto.phone,
        planId: starterPlan.id,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
        users: {
          create: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    const tokens = await this.generateTokens(user.id, tenant.id, user.role);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, trialEndsAt: tenant.trialEndsAt },
      tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { email, isActive: true },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    if (!['ACTIVE', 'TRIAL'].includes(user.tenant.status)) throw new UnauthorizedException('الحساب معلّق أو ملغي');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
    await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken, lastLoginAt: new Date() } });

    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, status: user.tenant.status },
      tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: this.config.get('JWT_REFRESH_SECRET') });
      const user = await this.prisma.user.findFirst({ where: { id: payload.sub, refreshToken, isActive: true } });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      const tokens = await this.generateTokens(user.id, user.tenantId, user.role);
      await this.prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
      return tokens;
    } catch { throw new UnauthorizedException('Invalid or expired refresh token'); }
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, refreshToken: null } });
    return { message: 'تم تغيير كلمة المرور بنجاح' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email } });
    // Always return the same message to prevent email enumeration attacks
    if (!user) return { message: 'إذا كان البريد مسجل، سيتم إرسال رابط إعادة التعيين' };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    // TODO: In production, send resetToken via email/SMS to the user
    // Example: await this.mailService.sendPasswordReset(email, resetToken);
    this.logger.log(`Password reset requested for ${email} — token expires at ${resetTokenExpiresAt.toISOString()}`);
    return { message: 'إذا كان البريد مسجل، سيتم إرسال رابط إعادة التعيين' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });
    if (!user) throw new BadRequestException('رمز إعادة التعيين غير صالح أو منتهي الصلاحية');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiresAt: null, refreshToken: null },
    });
    return { message: 'تم إعادة تعيين كلمة المرور بنجاح' };
  }

  private async generateTokens(userId: string, tenantId: string, role: string) {
    const payload = { sub: userId, tenantId, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '30d'),
      }),
    ]);
    return { accessToken, refreshToken, expiresIn: this.config.get('JWT_EXPIRATION', '7d') };
  }
}
