import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; tenantId: string; role: string }) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, isActive: true },
      include: { tenant: true },
    });
    if (!user || !['ACTIVE', 'TRIAL'].includes(user.tenant.status)) {
      throw new UnauthorizedException();
    }
    return { sub: user.id, tenantId: user.tenantId, role: user.role, email: user.email };
  }
}
