import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from '../../src/modules/products/products.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  const mockPrisma = {
    product: {
      findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(),
      update: jest.fn(), count: jest.fn(), updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findAll', () => {
    it('should return paginated products', async () => {
      const products = [{ id: '1', name: 'Test', price: 100 }];
      prisma.product.findMany.mockResolvedValue(products);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll('tenant-1', { page: 1, limit: 20 });
      expect(result.data).toEqual(products);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by search term', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll('tenant-1', { search: 'test' });
      const call = prisma.product.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
    });

    it('should filter by category', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll('tenant-1', { categoryId: 'cat-1' });
      const call = prisma.product.findMany.mock.calls[0][0];
      expect(call.where.categoryId).toBe('cat-1');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException for missing product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.findById('tenant-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should return product with category', async () => {
      const product = { id: '1', name: 'Test', category: { name: 'Cat' } };
      prisma.product.findFirst.mockResolvedValue(product);
      const result = await service.findById('tenant-1', '1');
      expect(result.name).toBe('Test');
    });
  });

  describe('delete', () => {
    it('should soft-delete product', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: '1' });
      prisma.product.update.mockResolvedValue({ id: '1', isActive: false });

      const result = await service.delete('tenant-1', '1');
      expect(prisma.product.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { isActive: false } });
    });
  });
});
