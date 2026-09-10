jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  InjectDataSource: () => () => undefined,
}));

import { PricingEngineService } from './pricing-engine.service';
import { ChargesEngineService } from '../charges/charges-engine.service';
import { SellerType, ChargeType } from '../../common/enums';

describe('PricingEngineService', () => {
  it('calculates checkout total from items', async () => {
    const chargesEngine = {
      evaluateChargeLines: jest.fn().mockResolvedValue([
        {
          code: 'PLATFORM_FEE',
          name: 'Platform Fee',
          type: ChargeType.FIXED,
          amount: 10,
        },
      ]),
      evaluateCharges: jest.fn().mockResolvedValue(10),
      calculateDeliveryFee: jest.fn().mockResolvedValue(30),
    } as unknown as ChargesEngineService;

    const service = new PricingEngineService(chargesEngine, {
      get: () => 0,
    } as never);

    const result = await service.calculateCheckout({
      items: [
        {
          sellerProductId: 'a',
          quantity: 2,
          unitPrice: 70,
          sellerType: SellerType.STORE,
          storeId: 'store-1',
        },
        {
          sellerProductId: 'b',
          quantity: 1,
          unitPrice: 75,
          sellerType: SellerType.INDEPENDENT,
          independentSellerId: 'seller-1',
        },
      ],
    });

    expect(result.subtotal).toBe(215);
    expect(result.charges).toHaveLength(1);
    expect(result.platformFee).toBe(10);
    expect(result.deliveryFee).toBe(30);
    expect(result.totalPayable).toBe(255);
    expect(result.sellerGroups).toHaveLength(2);
  });
});

describe('ChargesEngineService', () => {
  it('evaluates fixed charge rules for small carts', async () => {
    const repo = {
      findActiveChargeRules: jest.fn().mockResolvedValue([
        {
          type: ChargeType.FIXED,
          value: '20',
          conditions: { maxCartTotal: 200 },
        },
      ]),
      findActiveDeliverySlabs: jest.fn(),
    };

    const engine = new ChargesEngineService(repo as never);
    const lines = await engine.evaluateChargeLines(150);
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(20);
    expect(await engine.evaluateCharges(150)).toBe(20);
  });

  it('skips small order fee when cart exceeds threshold', async () => {
    const repo = {
      findActiveChargeRules: jest.fn().mockResolvedValue([
        {
          type: ChargeType.FIXED,
          value: '20',
          conditions: { maxCartTotal: 200 },
        },
      ]),
      findActiveDeliverySlabs: jest.fn(),
    };

    const engine = new ChargesEngineService(repo as never);
    const lines = await engine.evaluateChargeLines(250);
    expect(lines).toHaveLength(0);
    expect(await engine.evaluateCharges(250)).toBe(0);
  });

  it('skips charge when cart is below minCartValue', async () => {
    const repo = {
      findActiveChargeRules: jest.fn().mockResolvedValue([
        {
          code: 'HANDLING_FEE',
          name: 'Handling Fee',
          type: ChargeType.FIXED,
          value: '15',
          conditions: { minCartValue: 500 },
        },
      ]),
      findActiveDeliverySlabs: jest.fn(),
    };

    const engine = new ChargesEngineService(repo as never);
    expect(await engine.evaluateChargeLines(400)).toHaveLength(0);
    expect(await engine.evaluateChargeLines(500)).toHaveLength(1);
  });
});
