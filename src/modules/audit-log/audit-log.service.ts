import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(tenantId: string, userId: string | null, action: string, resource: string, resourceId?: string, details?: any, ipAddress?: string, userAgent?: string) {
    return this.prisma.auditLog.create({ data: { tenantId, userId, action, resource, resourceId, details: details || {}, ipAddress, userAgent } });
  }

  async findAll(tenantId: string, query: { page?: number; limit?: number; resource?: string; userId?: string; action?: string; from?: string; to?: string }) {
    const { page = 1, limit = 30, resource, userId, action, from, to } = query;
    const where: any = { tenantId };
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (from || to) { where.createdAt = {}; if (from) where.createdAt.gte = new Date(from); if (to) where.createdAt.lte = new Date(to); }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
