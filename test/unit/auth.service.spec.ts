import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;

  const mockPrisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    tenant: { create: jest.fn() },
    plan: { findFirst: jest.fn() },
  };

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string, def?: string) => def || 'test-value'),
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwt = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login('bad@test.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for suspended tenant', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: '1', email: 'test@test.com', passwordHash: '$2a$12$...', tenantId: 't1',
        tenant: { status: 'SUSPENDED' }, isActive: true,
      });
      await expect(service.login('test@test.com', 'password')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on valid login', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('validPass123', 12);
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1', email: 'test@test.com', passwordHash: hash, tenantId: 't1', firstName: 'Test', lastName: 'User', role: 'OWNER',
        isActive: true, tenant: { id: 't1', name: 'Test Store', slug: 'test', status: 'ACTIVE' },
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.login('test@test.com', 'validPass123');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(result.user.email).toBe('test@test.com');
    });
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: '1' });
      await expect(service.register({
        businessName: 'Test', email: 'exists@test.com', password: 'pass1234', firstName: 'A', lastName: 'B',
      })).rejects.toThrow(ConflictException);
    });

    it('should throw if no default plan exists', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.plan.findFirst.mockResolvedValue(null);
      await expect(service.register({
        businessName: 'Test', email: 'new@test.com', password: 'pass1234', firstName: 'A', lastName: 'B',
      })).rejects.toThrow('Default plan not found');
    });
  });

  describe('logout', () => {
    it('should clear refresh token', async () => {
      prisma.user.update.mockResolvedValue({});
      await service.logout('u1');
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { refreshToken: null } });
    });
  });
});
