import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRuleEntity } from './entities/commission-rule.entity';
import {
  CommissionEngineService,
  CommissionRepository,
} from './commission-engine.service';
import { CommissionService } from './commission.service';
import { CommissionAdminController } from './commission-admin.controller';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CommissionRuleEntity,
      StoreEntity,
      IndependentSellerEntity,
    ]),
  ],
  controllers: [CommissionAdminController],
  providers: [CommissionRepository, CommissionEngineService, CommissionService],
  exports: [CommissionEngineService, CommissionService],
})
export class CommissionModule {}
