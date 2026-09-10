import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
} from './entities/charge-rule.entity';
import {
  ChargesEngineService,
  ChargesRepository,
} from './charges-engine.service';
import { ChargesService } from './charges.service';
import { ChargesAdminController } from './charges-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChargeRuleEntity, DeliveryFeeSlabEntity]),
  ],
  controllers: [ChargesAdminController],
  providers: [ChargesRepository, ChargesEngineService, ChargesService],
  exports: [TypeOrmModule, ChargesEngineService, ChargesService],
})
export class ChargesModule {}
