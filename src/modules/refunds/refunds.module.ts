import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefundEntity } from './entities/refund.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { FinanceModule } from '../finance/finance.module';
import { RefundsController } from './refunds.controller';
import { RefundsService, RefundsRepository } from './refunds.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefundEntity, PaymentEntity]),
    FinanceModule,
  ],
  controllers: [RefundsController],
  providers: [RefundsService, RefundsRepository],
  exports: [RefundsService],
})
export class RefundsModule {}
