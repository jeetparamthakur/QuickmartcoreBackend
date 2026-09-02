import { Module } from '@nestjs/common';
import { PricingEngineService } from './pricing-engine.service';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [ChargesModule],
  providers: [PricingEngineService],
  exports: [PricingEngineService, ChargesModule],
})
export class PricingModule {}
