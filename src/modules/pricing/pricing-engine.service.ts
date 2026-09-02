import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChargesEngineService } from '../charges/charges-engine.service';

export interface PricingLineItem {
  sellerProductId: string;
  quantity: number;
  unitPrice: number;
  sellerType: string;
  storeId?: string | null;
  independentSellerId?: string | null;
}

export interface PricingInput {
  items: PricingLineItem[];
  distanceKm?: number;
  zoneId?: string | null;
}

export interface PricingBreakdown {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  platformFee: number;
  taxTotal: number;
  totalPayable: number;
  sellerGroups: Array<{
    sellerType: string;
    storeId?: string | null;
    independentSellerId?: string | null;
    subtotal: number;
    deliveryFee: number;
  }>;
}

@Injectable()
export class PricingEngineService {
  constructor(
    private readonly chargesEngine: ChargesEngineService,
    private readonly config: ConfigService,
  ) {}

  async calculateCheckout(input: PricingInput): Promise<PricingBreakdown> {
    const subtotal = input.items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );

    const groupMap = new Map<
      string,
      {
        sellerType: string;
        storeId?: string | null;
        independentSellerId?: string | null;
        subtotal: number;
      }
    >();

    for (const item of input.items) {
      const key =
        item.sellerType === 'STORE'
          ? `store:${item.storeId}`
          : `independent:${item.independentSellerId}`;
      const existing = groupMap.get(key) ?? {
        sellerType: item.sellerType,
        storeId: item.storeId,
        independentSellerId: item.independentSellerId,
        subtotal: 0,
      };
      existing.subtotal += item.unitPrice * item.quantity;
      groupMap.set(key, existing);
    }

    const deliveryFeePerGroup =
      (await this.chargesEngine.calculateDeliveryFee(
        input.distanceKm,
        input.zoneId,
      )) / Math.max(groupMap.size, 1);

    const sellerGroups = [...groupMap.values()].map((g) => ({
      ...g,
      deliveryFee: deliveryFeePerGroup,
    }));

    const deliveryFee = deliveryFeePerGroup * sellerGroups.length;
    const platformFee = await this.chargesEngine.evaluateCharges(subtotal, {
      cartTotal: subtotal,
      distanceKm: input.distanceKm,
      zoneId: input.zoneId,
    });
    const discountTotal = 0;
    const gstRate = this.config.get<number>('gstRate') ?? 0;
    const taxable = subtotal - discountTotal + deliveryFee + platformFee;
    const taxTotal = taxable * gstRate;
    const totalPayable =
      subtotal - discountTotal + deliveryFee + platformFee + taxTotal;

    return {
      subtotal,
      discountTotal,
      deliveryFee,
      platformFee,
      taxTotal,
      totalPayable,
      sellerGroups,
    };
  }
}
