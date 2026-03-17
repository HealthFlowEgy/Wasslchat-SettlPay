import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CouponsService } from '../../src/modules/coupons/coupons.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: any;

  const mockPrisma = {
    coupon: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(CouponsService);
    prisma = module.get(PrismaService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('validate', () => {
    it('should throw if coupon not found', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      await expect(service.validate('t1', 'BADCODE', 500)).rejects.toThrow(NotFoundException);
    });

    it('should throw if coupon is inactive', async () => {
      prisma.coupon.findFirst.mockResolvedValue({ id: 'c1', isActive: false });
      await expect(service.validate('t1', 'EXPIRED', 500)).rejects.toThrow(BadRequestException);
    });

    it('should throw if coupon has expired', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: new Date('2020-01-01'), maxUses: null, usedCount: 0, minOrderAmount: null,
      });
      await expect(service.validate('t1', 'OLD', 500)).rejects.toThrow(BadRequestException);
    });

    it('should throw if usage limit exceeded', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: null, maxUses: 10, usedCount: 10, minOrderAmount: null,
      });
      await expect(service.validate('t1', 'MAXED', 500)).rejects.toThrow(BadRequestException);
    });

    it('should throw if order below minimum', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderAmount: 200,
      });
      await expect(service.validate('t1', 'MIN200', 100)).rejects.toThrow(BadRequestException);
    });

    it('should return percentage discount', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderAmount: null,
        type: 'PERCENTAGE', value: 20, maxDiscount: 50,
      });
      const result = await service.validate('t1', 'PCT20', 300);
      expect(result.discount).toBe(50); // 20% of 300 = 60, capped at 50
    });

    it('should return fixed discount', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderAmount: null,
        type: 'FIXED_AMOUNT', value: 75, maxDiscount: null,
      });
      const result = await service.validate('t1', 'FIXED75', 300);
      expect(result.discount).toBe(75);
    });

    it('should not discount more than order total', async () => {
      prisma.coupon.findFirst.mockResolvedValue({
        id: 'c1', isActive: true, expiresAt: null, maxUses: null, usedCount: 0, minOrderAmount: null,
        type: 'FIXED_AMOUNT', value: 500, maxDiscount: null,
      });
      const result = await service.validate('t1', 'BIG', 300);
      expect(result.discount).toBe(300); // Capped at order total
    });
  });

  describe('redeem', () => {
    it('should increment usedCount', async () => {
      prisma.coupon.findFirst.mockResolvedValue({ id: 'c1' });
      prisma.coupon.update.mockResolvedValue({ id: 'c1', usedCount: 1 });
      await service.redeem('t1', 'CODE');
      expect(prisma.coupon.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { usedCount: { increment: 1 } },
      }));
    });
  });
});
