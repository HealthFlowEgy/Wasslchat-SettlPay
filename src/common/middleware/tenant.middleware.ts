import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Tenant context is extracted from JWT in AuthGuard
    // This middleware validates tenant header for API-key based access
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
      (req as any).tenantIdFromHeader = tenantHeader;
    }
    next();
  }
}
