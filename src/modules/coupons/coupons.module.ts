import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CouponEntity } from './entities/coupon.entity';
import { CouponsService, CouponsRepository } from './coupons.service';
import { CouponsAdminController } from './coupons-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CouponEntity])],
  controllers: [CouponsAdminController],
  providers: [CouponsService, CouponsRepository],
  exports: [CouponsService],
})
export class CouponsModule {}
