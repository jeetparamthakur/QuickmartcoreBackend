import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Application } from 'express';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

interface ProductListItem {
  id: string;
  sellerType: string;
}

interface ProductListResponse {
  data: ProductListItem[];
}

interface AuthResponse {
  token: string;
  user: { role: string; userType: string };
}

interface CartResponse {
  items: unknown[];
}

interface CheckoutResponse {
  parentOrder: unknown;
  subOrders: unknown[];
  pricing: { totalPayable: string };
}

describe('m3bd Commerce E2E', () => {
  let app: INestApplication;
  let httpServer: Application;
  let token: string;
  let storeProductId: string;
  let independentProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
    httpServer = app.getHttpServer() as Application;

    const productsRes = await request(httpServer)
      .get('/api/v1/products')
      .expect(200);

    const products = (productsRes.body as ProductListResponse).data;
    storeProductId = products.find((p) => p.sellerType === 'STORE')?.id ?? '';
    independentProductId =
      products.find((p) => p.sellerType === 'INDEPENDENT')?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a customer', async () => {
    const res = await request(httpServer)
      .post('/api/v1/auth/customer/register')
      .send({
        email: `customer-${Date.now()}@m3bd.test`,
        password: 'password123',
        fullName: 'Test Customer',
      })
      .expect(201);

    const body = res.body as AuthResponse;
    token = body.token;
    expect(body.user.role).toBe('CUSTOMER');
  });

  it('gets current user', async () => {
    const res = await request(httpServer)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const body = res.body as AuthResponse;
    expect(body.user.userType).toBe('CUSTOMER');
  });

  it('adds multi-vendor items to cart', async () => {
    if (!storeProductId || !independentProductId) {
      console.warn('Skipping cart test - run npm run seed first');
      return;
    }

    await request(httpServer)
      .post('/api/v1/customer/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerProductId: storeProductId, quantity: 1 })
      .expect(201);

    const cartRes = await request(httpServer)
      .post('/api/v1/customer/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerProductId: independentProductId, quantity: 1 })
      .expect(201);

    const body = cartRes.body as CartResponse;
    expect(body.items).toHaveLength(2);
  });

  it('checkout creates parent and sub orders', async () => {
    if (!storeProductId || !independentProductId) return;

    const res = await request(httpServer)
      .post('/api/v1/customer/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `checkout-${Date.now()}`)
      .expect(201);

    const body = res.body as CheckoutResponse;
    expect(body.parentOrder).toBeDefined();
    expect(body.subOrders.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(body.pricing.totalPayable)).toBeGreaterThan(0);
  });
});
