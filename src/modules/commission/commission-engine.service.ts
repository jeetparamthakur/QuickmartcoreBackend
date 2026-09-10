import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRuleType, SellerType } from '../../common/enums';
import { CommissionRuleEntity } from './entities/commission-rule.entity';

export interface CommissionContext {
  sellerType: SellerType;
  orderAmount: number;
  categoryId?: string;
  targetId?: string;
  effectiveDate?: Date;
}

export interface CommissionRateInfo {
  rate: number;
  type: CommissionRuleType;
  ruleId: string;
  ruleName: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
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
      order: { priority: 'ASC', effectiveFrom: 'DESC' },
    });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<CommissionRuleEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  save(entity: CommissionRuleEntity) {
    return this.repo.save(entity);
  }

  remove(entity: CommissionRuleEntity) {
    return this.repo.remove(entity);
  }

  findAll() {
    return this.repo.find({
      order: { priority: 'ASC', effectiveFrom: 'DESC' },
    });
  }
}

@Injectable()
export class CommissionEngineService {
  constructor(private readonly repo: CommissionRepository) {}

  async calculateCommission(context: CommissionContext): Promise<number> {
    const rule = await this.findMatchingRule(context);
    if (!rule) return 0;

    if (rule.type === CommissionRuleType.FIXED) {
      return parseFloat(rule.value);
    }

    return (context.orderAmount * parseFloat(rule.value)) / 100;
  }

  async getCurrentRate(
    context: Omit<CommissionContext, 'orderAmount'>,
  ): Promise<CommissionRateInfo | null> {
    const rule = await this.findMatchingRule({ ...context, orderAmount: 0 });
    if (!rule) return null;

    return {
      rate: parseFloat(rule.value),
      type: rule.type,
      ruleId: rule.id,
      ruleName: rule.name,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? null,
    };
  }

  async getScheduledRateChange(
    context: Omit<CommissionContext, 'orderAmount' | 'effectiveDate'>,
  ): Promise<CommissionRateInfo | null> {
    const now = new Date();
    const rules = await this.repo.findAll();
    const upcoming = rules
      .filter((rule) => rule.isActive && this.isScheduledFuture(rule, now))
      .filter((rule) => this.matchesSellerContext(rule, context))
      .sort(
        (a, b) =>
          new Date(a.effectiveFrom).getTime() -
          new Date(b.effectiveFrom).getTime(),
      );

    const rule = upcoming[0];
    if (!rule) return null;

    return {
      rate: parseFloat(rule.value),
      type: rule.type,
      ruleId: rule.id,
      ruleName: rule.name,
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? null,
    };
  }

  listRules() {
    return this.repo.findAll();
  }

  private async findMatchingRule(
    context: CommissionContext,
  ): Promise<CommissionRuleEntity | null> {
    const effectiveDate = context.effectiveDate ?? new Date();
    const rules = await this.repo.findActiveRules();

    for (const rule of rules) {
      if (!this.isEffectiveOn(rule, effectiveDate)) continue;
      if (!this.matchesSellerContext(rule, context)) continue;

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

      return rule;
    }

    return null;
  }

  private matchesSellerContext(
    rule: CommissionRuleEntity,
    context: Omit<CommissionContext, 'orderAmount' | 'effectiveDate'>,
  ) {
    if (rule.sellerType && rule.sellerType !== context.sellerType) {
      return false;
    }

    if (rule.targetId) {
      return Boolean(context.targetId && rule.targetId === context.targetId);
    }

    return true;
  }

  private isEffectiveOn(rule: CommissionRuleEntity, date: Date) {
    const from = new Date(rule.effectiveFrom);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;

    if (rule.effectiveTo) {
      const to = new Date(rule.effectiveTo);
      to.setHours(23, 59, 59, 999);
      if (date > to) return false;
    }

    return true;
  }

  private isScheduledFuture(rule: CommissionRuleEntity, now: Date) {
    const from = new Date(rule.effectiveFrom);
    from.setHours(0, 0, 0, 0);
    return from > now;
  }
}
