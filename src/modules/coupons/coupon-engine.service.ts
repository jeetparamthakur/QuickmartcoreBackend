import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CouponFundingSource,
  CouponScopeType,
  CouponType,
  SellerType,
} from '../../common/enums';
import { PricingLineItem } from '../pricing/pricing-engine.service';
import { CouponEntity } from './entities/coupon.entity';
import { CouponRedemptionEntity } from './entities/coupon-redemption.entity';
import { CouponsRepository } from './coupons.service';

export interface CartGroupContext {
  sellerType: SellerType;
  storeId?: string | null;
  independentSellerId?: string | null;
  subtotal: number;
}

export interface CouponCartContext {
  customerId: string;
  items: PricingLineItem[];
}

export interface CouponGroupAllocation {
  sellerType: string;
  storeId?: string | null;
  independentSellerId?: string | null;
  discount: number;
}

export interface CouponApplicationResult {
  discountTotal: number;
  groupAllocations: CouponGroupAllocation[];
  coupon: CouponEntity;
  fundingSource: CouponFundingSource;
  couponId: string;
  couponCode: string;
}

@Injectable()
export class CouponEngineService {
  constructor(
    private readonly couponsRepo: CouponsRepository,
    @InjectRepository(CouponRedemptionEntity)
    private readonly redemptionRepo: Repository<CouponRedemptionEntity>,
  ) {}

  buildGroups(items: PricingLineItem[]): CartGroupContext[] {
    const groupMap = new Map<string, CartGroupContext>();

    for (const item of items) {
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

    return [...groupMap.values()];
  }

  async validateAndCalculate(
    code: string,
    context: CouponCartContext,
  ): Promise<CouponApplicationResult> {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException({
        message: 'Coupon code is required',
        errorCode: 'COUPON_CODE_REQUIRED',
      });
    }

    const coupon = await this.couponsRepo.findByCode(normalizedCode);
    if (!coupon) {
      throw new BadRequestException({
        message: 'Invalid coupon code',
        errorCode: 'COUPON_INVALID',
      });
    }

    await this.assertCouponUsable(coupon, context.customerId);

    const groups = this.buildGroups(context.items);
    const cartSubtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);

    if (cartSubtotal <= 0) {
      throw new BadRequestException({
        message: 'Cart is empty',
        errorCode: 'CART_EMPTY',
      });
    }

    const eligibleSubtotal = this.getEligibleSubtotal(coupon, groups);
    if (eligibleSubtotal <= 0) {
      throw new BadRequestException({
        message: 'Coupon is not applicable to items in your cart',
        errorCode: 'COUPON_NOT_APPLICABLE',
      });
    }

    const minOrder = parseFloat(coupon.minOrderAmount ?? '0');
    if (eligibleSubtotal < minOrder) {
      throw new BadRequestException({
        message: `Minimum order amount of ₹${minOrder} required for this coupon`,
        errorCode: 'COUPON_MIN_ORDER',
      });
    }

    const rawDiscount = this.computeDiscount(coupon, eligibleSubtotal);
    const discountTotal = Math.min(rawDiscount, cartSubtotal);
    const groupAllocations = this.allocateDiscount(
      coupon,
      groups,
      discountTotal,
      cartSubtotal,
    );

    return {
      discountTotal,
      groupAllocations,
      coupon,
      fundingSource: coupon.fundingSource,
      couponId: coupon.id,
      couponCode: coupon.code,
    };
  }

  async recordRedemption(
    couponId: string,
    customerId: string,
    parentOrderId: string,
    discountAmount: number,
  ) {
    await this.redemptionRepo.save(
      this.redemptionRepo.create({
        couponId,
        customerId,
        parentOrderId,
        discountAmount: discountAmount.toFixed(2),
        redeemedAt: new Date(),
      }),
    );
    await this.couponsRepo.incrementUsedCount(couponId);
  }

  resolveFundingSource(scopeType: CouponScopeType): CouponFundingSource {
    return scopeType === CouponScopeType.GLOBAL
      ? CouponFundingSource.PLATFORM
      : CouponFundingSource.SELLER;
  }

  private async assertCouponUsable(coupon: CouponEntity, customerId: string) {
    if (!coupon.isActive) {
      throw new BadRequestException({
        message: 'This coupon is no longer active',
        errorCode: 'COUPON_INACTIVE',
      });
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException({
        message: 'This coupon is not yet valid',
        errorCode: 'COUPON_NOT_STARTED',
      });
    }
    if (coupon.expiresAt && now > coupon.expiresAt) {
      throw new BadRequestException({
        message: 'This coupon has expired',
        errorCode: 'COUPON_EXPIRED',
      });
    }

    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException({
        message: 'This coupon has reached its usage limit',
        errorCode: 'COUPON_USAGE_LIMIT',
      });
    }

    const customerUses = await this.redemptionRepo.count({
      where: { couponId: coupon.id, customerId },
    });
    if (customerUses >= coupon.perCustomerLimit) {
      throw new BadRequestException({
        message: 'You have already used this coupon',
        errorCode: 'COUPON_CUSTOMER_LIMIT',
      });
    }
  }

  private getEligibleSubtotal(
    coupon: CouponEntity,
    groups: CartGroupContext[],
  ) {
    if (coupon.scopeType === CouponScopeType.GLOBAL) {
      return groups.reduce((sum, g) => sum + g.subtotal, 0);
    }

    if (coupon.scopeType === CouponScopeType.STORE) {
      return groups
        .filter(
          (g) =>
            g.sellerType === SellerType.STORE && g.storeId === coupon.storeId,
        )
        .reduce((sum, g) => sum + g.subtotal, 0);
    }

    return groups
      .filter(
        (g) =>
          g.sellerType === SellerType.INDEPENDENT &&
          g.independentSellerId === coupon.independentSellerId,
      )
      .reduce((sum, g) => sum + g.subtotal, 0);
  }

  private computeDiscount(coupon: CouponEntity, eligibleSubtotal: number) {
    const value = parseFloat(coupon.value);

    if (coupon.type === CouponType.PERCENTAGE) {
      let discount = (eligibleSubtotal * value) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, parseFloat(coupon.maxDiscount));
      }
      return discount;
    }

    return Math.min(value, eligibleSubtotal);
  }

  private allocateDiscount(
    coupon: CouponEntity,
    groups: CartGroupContext[],
    discountTotal: number,
    cartSubtotal: number,
  ): CouponGroupAllocation[] {
    if (discountTotal <= 0) {
      return groups.map((g) => ({ ...g, discount: 0 }));
    }

    if (coupon.scopeType === CouponScopeType.STORE) {
      return groups.map((g) => ({
        sellerType: g.sellerType,
        storeId: g.storeId,
        independentSellerId: g.independentSellerId,
        discount:
          g.sellerType === SellerType.STORE && g.storeId === coupon.storeId
            ? discountTotal
            : 0,
      }));
    }

    if (coupon.scopeType === CouponScopeType.INDEPENDENT_SELLER) {
      return groups.map((g) => ({
        sellerType: g.sellerType,
        storeId: g.storeId,
        independentSellerId: g.independentSellerId,
        discount:
          g.sellerType === SellerType.INDEPENDENT &&
          g.independentSellerId === coupon.independentSellerId
            ? discountTotal
            : 0,
      }));
    }

    return groups.map((g) => ({
      sellerType: g.sellerType,
      storeId: g.storeId,
      independentSellerId: g.independentSellerId,
      discount:
        cartSubtotal > 0 ? (g.subtotal / cartSubtotal) * discountTotal : 0,
    }));
  }
}
