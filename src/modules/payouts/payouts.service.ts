import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryType, PayoutStatus } from '../../common/enums';
import { FinanceService } from '../finance/finance.service';
import { PayoutEntity } from './entities/payout.entity';

@Injectable()
export class PayoutsRepository {
  constructor(
    @InjectRepository(PayoutEntity)
    private readonly repo: Repository<PayoutEntity>,
  ) {}

  create(data: Partial<PayoutEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  update(id: string, data: Partial<PayoutEntity>) {
    const { metadata: _m, ...updateData } = data;
    return this.repo.update(id, updateData);
  }
}

@Injectable()
export class PayoutsService {
  constructor(
    private readonly repo: PayoutsRepository,
    private readonly financeService: FinanceService,
  ) {}

  listPayouts() {
    return this.repo.findAll();
  }

  async createPayout(data: Partial<PayoutEntity>) {
    if (!data.beneficiaryId || !data.amount || !data.beneficiaryType) {
      throw new BadRequestException('Missing required payout fields');
    }

    return this.repo.create({
      ...data,
      status: PayoutStatus.PENDING,
    });
  }

  async approvePayout(id: string, approvedBy: string) {
    const payout = await this.repo.findById(id);
    if (!payout) {
      throw new NotFoundException({
        message: 'Payout not found',
        errorCode: 'PAYOUT_NOT_FOUND',
      });
    }

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException({
        message: 'Payout is not pending',
        errorCode: 'PAYOUT_NOT_PENDING',
      });
    }

    await this.repo.update(id, {
      status: PayoutStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
    });

    await this.financeService.writeEntry({
      type: LedgerEntryType.PAYOUT,
      amount: payout.amount,
      referenceId: id,
      referenceType: 'Payout',
      metadata: { beneficiaryId: payout.beneficiaryId },
    });

    return this.repo.findById(id);
  }

  getPayout(id: string) {
    return this.repo.findById(id);
  }
}
