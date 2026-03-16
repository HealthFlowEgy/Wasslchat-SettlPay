import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('WasslChat API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/v1/health — should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect(res => {
          expect(res.body.status).toBe('ok');
          expect(res.body.version).toBeDefined();
        });
    });

    it('GET /api/v1/health/ready — should check DB', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200)
        .expect(res => {
          expect(res.body.checks).toBeDefined();
          expect(res.body.checks.database).toBeDefined();
        });
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/login — should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrongpass' })
        .expect(401);
    });

    it('POST /api/v1/auth/register — should reject missing fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com' })
        .expect(400);
    });

    it('POST /api/v1/auth/register — should reject invalid Egyptian phone', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          businessName: 'Test', email: 'test@test.com', password: 'Test1234!',
          firstName: 'Test', lastName: 'User', phone: '12345',
        })
        .expect(400)
        .expect(res => {
          expect(JSON.stringify(res.body)).toContain('هاتف');
        });
    });
  });

  describe('Protected Routes', () => {
    it('GET /api/v1/products — should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(401);
    });

    it('GET /api/v1/orders — should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(401);
    });
  });
});
