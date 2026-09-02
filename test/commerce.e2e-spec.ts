import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

describe('m3bd Commerce E2E', () => {
  let app: INestApplication;
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

    const productsRes = await request(app.getHttpServer())
      .get('/api/v1/products')
      .expect(200);

    const products = productsRes.body.data;
    storeProductId = products.find((p: { sellerType: string }) => p.sellerType === 'STORE')?.id;
    independentProductId = products.find(
      (p: { sellerType: string }) => p.sellerType === 'INDEPENDENT',
    )?.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/customer/register')
      .send({
        email: `customer-${Date.now()}@m3bd.test`,
        password: 'password123',
        fullName: 'Test Customer',
      })
      .expect(201);

    token = res.body.token;
    expect(res.body.user.role).toBe('CUSTOMER');
  });

  it('gets current user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.userType).toBe('CUSTOMER');
  });

  it('adds multi-vendor items to cart', async () => {
    if (!storeProductId || !independentProductId) {
      console.warn('Skipping cart test - run npm run seed first');
      return;
    }

    await request(app.getHttpServer())
      .post('/api/v1/customer/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerProductId: storeProductId, quantity: 1 })
      .expect(201);

    const cartRes = await request(app.getHttpServer())
      .post('/api/v1/customer/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sellerProductId: independentProductId, quantity: 1 })
      .expect(201);

    expect(cartRes.body.items).toHaveLength(2);
  });

  it('checkout creates parent and sub orders', async () => {
    if (!storeProductId || !independentProductId) return;

    const res = await request(app.getHttpServer())
      .post('/api/v1/customer/checkout')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', `checkout-${Date.now()}`)
      .expect(201);

    expect(res.body.parentOrder).toBeDefined();
    expect(res.body.subOrders.length).toBeGreaterThanOrEqual(1);
    expect(parseFloat(res.body.pricing.totalPayable)).toBeGreaterThan(0);
  });
});
