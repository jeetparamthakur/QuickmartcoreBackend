import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { IdempotencyKeyEntity } from '../audit-logs/entities/audit-log.entity';
import { FinanceModule } from '../finance/finance.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import { PAYMENTS_REPOSITORY } from './payments.repository.port';
import { PAYMENT_PROVIDER } from './payment-provider.port';
import { StubPaymentProvider } from './stub-payment.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentEntity,
      ParentOrderEntity,
      IdempotencyKeyEntity,
    ]),
    FinanceModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    { provide: PAYMENTS_REPOSITORY, useExisting: PaymentsRepository },
    StubPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: StubPaymentProvider },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
