import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponEntity } from './entities/coupon.entity';
import { CouponRedemptionEntity } from './entities/coupon-redemption.entity';
import { CouponsService, CouponsRepository } from './coupons.service';
import { CouponEngineService } from './coupon-engine.service';
import { CouponsAdminController } from './coupons-admin.controller';
import { CouponsSellerController } from './coupons-seller.controller';
import { PricingModule } from '../pricing/pricing.module';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CouponEntity,
      CouponRedemptionEntity,
      SellerProfileEntity,
      StoreOwnerProfileEntity,
      StoreEntity,
      IndependentSellerEntity,
    ]),
    forwardRef(() => PricingModule),
  ],
  controllers: [CouponsAdminController, CouponsSellerController],
  providers: [CouponsService, CouponsRepository, CouponEngineService],
  exports: [CouponsService, CouponEngineService, CouponsRepository],
})
export class CouponsModule {}
