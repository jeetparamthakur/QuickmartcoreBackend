import { calculatePartnerPayFromSlabs } from './delivery-partner-pay-slab.util';

describe('calculatePartnerPayFromSlabs', () => {
  const globalSlabs = [
    { minKm: '0', maxKm: '5', fee: '40.00' },
    { minKm: '5', maxKm: '10', fee: '55.00' },
  ];

  it('returns slab fee inside range', () => {
    expect(calculatePartnerPayFromSlabs(3, globalSlabs)).toBe(40);
  });

  it('uses partner override slabs when provided', () => {
    const partnerSlabs = [{ minKm: '0', maxKm: '5', fee: '70.00' }];
    expect(calculatePartnerPayFromSlabs(2, partnerSlabs)).toBe(70);
  });

  it('falls back to formula when no slabs', () => {
    expect(calculatePartnerPayFromSlabs(3, [])).toBe(20 + 2 * 8);
  });
});
