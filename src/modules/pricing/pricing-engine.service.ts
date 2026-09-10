import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ChargeLineItem,
  ChargesEngineService,
} from '../charges/charges-engine.service';
import { CouponEngineService } from '../coupons/coupon-engine.service';
import { CouponFundingSource, SellerType } from '../../common/enums';

export interface PricingLineItem {
  sellerProductId: string;
  quantity: number;
  unitPrice: number;
  sellerType: SellerType;
  storeId?: string | null;
  independentSellerId?: string | null;
}

export interface PricingInput {
  items: PricingLineItem[];
  distanceKm?: number;
  zoneId?: string | null;
  couponCode?: string | null;
  customerId?: string;
}

export interface PricingBreakdown {
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  charges: ChargeLineItem[];
  platformFee: number;
  taxTotal: number;
  totalPayable: number;
  couponId?: string;
  couponCode?: string;
  fundingSource?: CouponFundingSource;
  sellerGroups: Array<{
    sellerType: SellerType;
    storeId?: string | null;
    independentSellerId?: string | null;
    subtotal: number;
    discountTotal: number;
    deliveryFee: number;
  }>;
}

@Injectable()
export class PricingEngineService {
  constructor(
    private readonly chargesEngine: ChargesEngineService,
    private readonly config: ConfigService,
    private readonly couponEngine: CouponEngineService,
  ) {}

  async calculateCheckout(input: PricingInput): Promise<PricingBreakdown> {
    const subtotal = input.items.reduce(
      (sum, i) => sum + i.unitPrice * i.quantity,
      0,
    );

    const groupMap = new Map<
      string,
      {
        sellerType: SellerType;
        storeId?: string | null;
        independentSellerId?: string | null;
        subtotal: number;
      }
    >();

    for (const item of input.items) {
      const key =
        item.sellerType === SellerType.STORE
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

    let discountTotal = 0;
    let couponId: string | undefined;
    let couponCode: string | undefined;
    let fundingSource: CouponFundingSource | undefined;
    const groupDiscountMap = new Map<string, number>();

    if (input.couponCode && input.customerId) {
      const couponResult = await this.couponEngine.validateAndCalculate(
        input.couponCode,
        { customerId: input.customerId, items: input.items },
      );
      discountTotal = couponResult.discountTotal;
      couponId = couponResult.couponId;
      couponCode = couponResult.couponCode;
      fundingSource = couponResult.fundingSource;

      for (const allocation of couponResult.groupAllocations) {
        const key =
          allocation.sellerType === 'STORE'
            ? `store:${allocation.storeId}`
            : `independent:${allocation.independentSellerId}`;
        groupDiscountMap.set(key, allocation.discount);
      }
    }

    const deliveryFeePerGroup =
      (await this.chargesEngine.calculateDeliveryFee(
        input.distanceKm,
        input.zoneId,
      )) / Math.max(groupMap.size, 1);

    const sellerGroups = [...groupMap.entries()].map(([key, g]) => ({
      ...g,
      discountTotal: groupDiscountMap.get(key) ?? 0,
      deliveryFee: deliveryFeePerGroup,
    }));

    const deliveryFee = deliveryFeePerGroup * sellerGroups.length;
    const charges = await this.chargesEngine.evaluateChargeLines(subtotal, {
      cartTotal: subtotal,
      distanceKm: input.distanceKm,
      zoneId: input.zoneId,
    });
    const platformFee = charges.reduce((sum, charge) => sum + charge.amount, 0);
    const gstRate = this.config.get<number>('gstRate') ?? 0;
    const taxable = subtotal - discountTotal + deliveryFee + platformFee;
    const taxTotal = taxable * gstRate;
    const totalPayable =
      subtotal - discountTotal + deliveryFee + platformFee + taxTotal;

    return {
      subtotal,
      discountTotal,
      deliveryFee,
      charges,
      platformFee,
      taxTotal,
      totalPayable,
      couponId,
      couponCode,
      fundingSource,
      sellerGroups,
    };
  }
}
