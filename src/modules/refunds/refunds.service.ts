import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryType, PaymentStatus, RefundStatus } from '../../common/enums';
import { PaymentEntity } from '../payments/entities/payment.entity';
import { FinanceService } from '../finance/finance.service';
import { RefundEntity } from './entities/refund.entity';
import { CreateRefundDto } from '../payments/dto/payments.dto';

@Injectable()
export class RefundsRepository {
  constructor(
    @InjectRepository(RefundEntity)
    private readonly repo: Repository<RefundEntity>,
  ) {}

  create(data: Partial<RefundEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['payment'] });
  }
}

@Injectable()
export class RefundsService {
  constructor(
    private readonly repo: RefundsRepository,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    private readonly financeService: FinanceService,
  ) {}

  async createRefund(dto: CreateRefundDto) {
    const payment = await this.payments.findOne({ where: { id: dto.paymentId } });
    if (!payment) {
      throw new NotFoundException({
        message: 'Payment not found',
        errorCode: 'PAYMENT_NOT_FOUND',
      });
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BadRequestException({
        message: 'Payment is not eligible for refund',
        errorCode: 'PAYMENT_NOT_REFUNDABLE',
      });
    }

    if (parseFloat(dto.amount) > parseFloat(payment.amount)) {
      throw new BadRequestException({
        message: 'Refund amount exceeds payment amount',
        errorCode: 'REFUND_AMOUNT_EXCEEDED',
      });
    }

    const refund = await this.repo.create({
      paymentId: dto.paymentId,
      amount: dto.amount,
      reason: dto.reason,
      status: RefundStatus.COMPLETED,
      providerRef: `refund_${Date.now()}`,
    });

    await this.payments.update(payment.id, {
      status: PaymentStatus.REFUNDED,
    });

    await this.financeService.writeEntry({
      type: LedgerEntryType.REFUND,
      amount: dto.amount,
      referenceId: refund.id,
      referenceType: 'Refund',
      metadata: { paymentId: dto.paymentId },
    });

    return refund;
  }

  getRefund(id: string) {
    return this.repo.findById(id);
  }
}
