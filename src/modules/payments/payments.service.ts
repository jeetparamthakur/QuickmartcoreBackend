import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, PaymentStatus, LedgerEntryType } from '../../common/enums';
import { IdempotencyKeyEntity } from '../audit-logs/entities/audit-log.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { FinanceService } from '../finance/finance.service';
import {
  PAYMENTS_REPOSITORY,
  ConfirmPaymentInput,
} from './payments.repository.port';
import type { PaymentsRepositoryPort } from './payments.repository.port';
import { PAYMENT_PROVIDER } from './payment-provider.port';
import type { PaymentProviderPort } from './payment-provider.port';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepo: PaymentsRepositoryPort,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProviderPort,
    @InjectRepository(ParentOrderEntity)
    private readonly parentOrders: Repository<ParentOrderEntity>,
    @InjectRepository(IdempotencyKeyEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyEntity>,
    private readonly financeService: FinanceService,
  ) {}

  async confirmPayment(input: ConfirmPaymentInput) {
    if (input.idempotencyKey) {
      const existingKey = await this.idempotencyRepo.findOne({
        where: { key: input.idempotencyKey },
      });
      if (existingKey && existingKey.expiresAt > new Date()) {
        return existingKey.responseBody;
      }

      const existingPayment = await this.paymentsRepo.findByIdempotencyKey(
        input.idempotencyKey,
      );
      if (existingPayment) {
        return existingPayment;
      }
    }

    const order = await this.parentOrders.findOne({
      where: { id: input.parentOrderId },
    });
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    if (order.paymentStatus === PaymentStatus.SUCCESS) {
      throw new BadRequestException({
        message: 'Order already paid',
        errorCode: 'ORDER_ALREADY_PAID',
      });
    }

    const payment = await this.paymentsRepo.create({
      parentOrderId: input.parentOrderId,
      amount: input.amount,
      method: input.method as PaymentMethod,
      status: PaymentStatus.PROCESSING,
      idempotencyKey: input.idempotencyKey,
    });

    const providerResult = await this.provider.initiatePayment(
      input.amount,
      payment.id,
    );

    if (!providerResult.success) {
      await this.paymentsRepo.update(payment.id, {
        status: PaymentStatus.FAILED,
      });
      throw new BadRequestException({
        message: providerResult.errorMessage ?? 'Payment failed',
        errorCode: 'PAYMENT_FAILED',
      });
    }

    const confirmed = await this.paymentsRepo.update(payment.id, {
      status: PaymentStatus.SUCCESS,
      providerRef: providerResult.providerRef ?? input.providerRef,
    });

    await this.parentOrders.update(input.parentOrderId, {
      paymentStatus: PaymentStatus.SUCCESS,
    });

    await this.financeService.writeEntry({
      type: LedgerEntryType.CUSTOMER_PAYMENT,
      amount: input.amount,
      referenceId: confirmed.id,
      referenceType: 'Payment',
      metadata: { parentOrderId: input.parentOrderId },
    });

    if (parseFloat(order.platformFee) > 0) {
      await this.financeService.writeEntry({
        type: LedgerEntryType.PLATFORM_FEE,
        amount: order.platformFee,
        referenceId: confirmed.id,
        referenceType: 'Payment',
        metadata: { parentOrderId: input.parentOrderId },
      });
    }

    if (input.idempotencyKey) {
      await this.idempotencyRepo.save(
        this.idempotencyRepo.create({
          key: input.idempotencyKey,
          responseBody: confirmed as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
    }

    return confirmed;
  }

  async getPayment(id: string) {
    const payment = await this.paymentsRepo.findById(id);
    if (!payment) {
      throw new NotFoundException({
        message: 'Payment not found',
        errorCode: 'PAYMENT_NOT_FOUND',
      });
    }
    return payment;
  }
}
