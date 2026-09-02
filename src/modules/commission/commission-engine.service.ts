import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRuleType, SellerType } from '../../common/enums';
import { CommissionRuleEntity } from './entities/commission-rule.entity';

export interface CommissionContext {
  sellerType: SellerType;
  orderAmount: number;
  categoryId?: string;
}

@Injectable()
export class CommissionRepository {
  constructor(
    @InjectRepository(CommissionRuleEntity)
    private readonly repo: Repository<CommissionRuleEntity>,
  ) {}

  findActiveRules() {
    return this.repo.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<CommissionRuleEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findAll() {
    return this.repo.find({ order: { priority: 'ASC' } });
  }
}

@Injectable()
export class CommissionEngineService {
  constructor(private readonly repo: CommissionRepository) {}

  async calculateCommission(context: CommissionContext): Promise<number> {
    const rules = await this.repo.findActiveRules();

    for (const rule of rules) {
      if (rule.sellerType && rule.sellerType !== context.sellerType) {
        continue;
      }

      const conditions = rule.conditions as {
        minOrderAmount?: number;
        categoryId?: string;
      };

      if (
        conditions.minOrderAmount !== undefined &&
        context.orderAmount < conditions.minOrderAmount
      ) {
        continue;
      }

      if (
        conditions.categoryId &&
        context.categoryId &&
        conditions.categoryId !== context.categoryId
      ) {
        continue;
      }

      if (rule.type === CommissionRuleType.FIXED) {
        return parseFloat(rule.value);
      }

      return (context.orderAmount * parseFloat(rule.value)) / 100;
    }

    return 0;
  }

  listRules() {
    return this.repo.findAll();
  }
}
