import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayoutEntity } from './entities/payout.entity';
import { FinanceModule } from '../finance/finance.module';
import { PayoutsController } from './payouts.controller';
import { PayoutsService, PayoutsRepository } from './payouts.service';

@Module({
  imports: [TypeOrmModule.forFeature([PayoutEntity]), FinanceModule],
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutsRepository],
  exports: [PayoutsService],
})
export class PayoutsModule {}
