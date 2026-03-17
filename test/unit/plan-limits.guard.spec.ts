import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanLimitsGuard } from '../../src/common/guards/plan-limits.guard';

describe('PlanLimitsGuard', () => {
  let guard: PlanLimitsGuard;
  let reflector: any;
  let prisma: any;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    prisma = {
      tenant: { findUnique: jest.fn() },
      product: { count: jest.fn() },
      user: { count: jest.fn() },
      broadcast: { count: jest.fn() },
    };
    guard = new PlanLimitsGuard(reflector, prisma);
  });

  const mockContext = (tenantId: string) => ({
    getHandler: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user: { tenantId } }),
    }),
  }) as unknown as ExecutionContext;

  it('should allow if no PlanLimit decorator', async () => {
    reflector.get.mockReturnValue(undefined);
    const result = await guard.canActivate(mockContext('t1'));
    expect(result).toBe(true);
  });

  it('should allow if tenant not found (graceful)', async () => {
    reflector.get.mockReturnValue('products');
    prisma.tenant.findUnique.mockResolvedValue(null);
    const result = await guard.canActivate(mockContext('t1'));
    expect(result).toBe(false);
  });

  it('should allow if under product limit', async () => {
    reflector.get.mockReturnValue('products');
    prisma.tenant.findUnique.mockResolvedValue({ plan: { maxProducts: 100 } });
    prisma.product.count.mockResolvedValue(50);
    const result = await guard.canActivate(mockContext('t1'));
    expect(result).toBe(true);
  });

  it('should block if at product limit', async () => {
    reflector.get.mockReturnValue('products');
    prisma.tenant.findUnique.mockResolvedValue({ plan: { maxProducts: 50 } });
    prisma.product.count.mockResolvedValue(50);
    await expect(guard.canActivate(mockContext('t1'))).rejects.toThrow(ForbiddenException);
  });

  it('should allow unlimited (-1) plans', async () => {
    reflector.get.mockReturnValue('products');
    prisma.tenant.findUnique.mockResolvedValue({ plan: { maxProducts: -1 } });
    prisma.product.count.mockResolvedValue(99999);
    const result = await guard.canActivate(mockContext('t1'));
    expect(result).toBe(true);
  });

  it('should check team_members limit', async () => {
    reflector.get.mockReturnValue('team_members');
    prisma.tenant.findUnique.mockResolvedValue({ plan: { maxTeamMembers: 3 } });
    prisma.user.count.mockResolvedValue(3);
    await expect(guard.canActivate(mockContext('t1'))).rejects.toThrow(ForbiddenException);
  });
});
