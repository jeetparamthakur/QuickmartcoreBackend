import { Module, forwardRef } from '@nestjs/common';
import { PricingEngineService } from './pricing-engine.service';
import { ChargesModule } from '../charges/charges.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [ChargesModule, forwardRef(() => CouponsModule)],
  providers: [PricingEngineService],
  exports: [PricingEngineService, ChargesModule],
})
export class PricingModule {}
