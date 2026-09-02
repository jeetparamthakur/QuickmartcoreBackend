import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
} from './entities/charge-rule.entity';
import { ChargesEngineService, ChargesRepository } from './charges-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChargeRuleEntity, DeliveryFeeSlabEntity])],
  providers: [ChargesRepository, ChargesEngineService],
  exports: [TypeOrmModule, ChargesEngineService],
})
export class ChargesModule {}
