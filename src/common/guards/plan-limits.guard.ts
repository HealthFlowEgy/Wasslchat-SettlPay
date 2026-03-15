import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

export const PLAN_LIMIT_KEY = 'planLimit';
export const PlanLimit = (resource: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(PLAN_LIMIT_KEY, resource, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitsGuard.name);

  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<string>(PLAN_LIMIT_KEY, context.getHandler());
    if (!resource) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
    if (!tenant) return false;

    const plan = tenant.plan;
    let currentCount = 0;
    let maxAllowed = 0;

    switch (resource) {
      case 'products':
        currentCount = await this.prisma.product.count({ where: { tenantId, isActive: true } });
        maxAllowed = plan.maxProducts;
        break;
      case 'team_members':
        currentCount = await this.prisma.user.count({ where: { tenantId, isActive: true } });
        maxAllowed = plan.maxTeamMembers;
        break;
      case 'contacts':
        currentCount = await this.prisma.contact.count({ where: { tenantId } });
        maxAllowed = plan.maxContacts;
        break;
      case 'broadcasts':
        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        currentCount = await this.prisma.broadcast.count({ where: { tenantId, createdAt: { gte: monthStart } } });
        maxAllowed = plan.maxBroadcastsPerMonth;
        break;
      default:
        return true;
    }

    // -1 means unlimited
    if (maxAllowed === -1) return true;
    if (currentCount >= maxAllowed) {
      throw new ForbiddenException(`لقد وصلت للحد الأقصى في خطتك (${plan.name}): ${maxAllowed} ${resource}. يرجى ترقية خطتك.`);
    }
    return true;
  }
}
