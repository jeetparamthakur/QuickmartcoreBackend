import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionRuleEntity } from './entities/commission-rule.entity';
import {
  CommissionEngineService,
  CommissionRepository,
} from './commission-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([CommissionRuleEntity])],
  providers: [CommissionRepository, CommissionEngineService],
  exports: [CommissionEngineService],
})
export class CommissionModule {}
