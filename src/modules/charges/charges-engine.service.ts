import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
} from './entities/charge-rule.entity';
import { ChargeType } from '../../common/enums';

export interface ChargeEvaluationContext {
  cartTotal: number;
  distanceKm?: number;
  zoneId?: string | null;
}

export interface ChargeLineItem {
  code: string;
  name: string;
  type: ChargeType;
  amount: number;
}

type ChargeConditions = {
  maxCartTotal?: number;
  minCartValue?: number;
  minDistanceKm?: number;
  maxDistanceKm?: number;
  zoneId?: string;
};

@Injectable()
export class ChargesRepository {
  constructor(
    @InjectRepository(ChargeRuleEntity)
    private readonly chargeRules: Repository<ChargeRuleEntity>,
    @InjectRepository(DeliveryFeeSlabEntity)
    private readonly deliverySlabs: Repository<DeliveryFeeSlabEntity>,
  ) {}

  findActiveChargeRules() {
    return this.chargeRules.find({
      where: { isActive: true },
      order: { priority: 'ASC' },
    });
  }

  findActiveDeliverySlabs(zoneId?: string | null) {
    if (zoneId) {
      return this.deliverySlabs.find({
        where: { isActive: true, zoneId },
        order: { minKm: 'ASC' },
      });
    }
    return this.deliverySlabs.find({
      where: { isActive: true },
      order: { minKm: 'ASC' },
    });
  }
}

@Injectable()
export class ChargesEngineService {
  constructor(private readonly repo: ChargesRepository) {}

  private ruleMatches(
    rule: ChargeRuleEntity,
    cartTotal: number,
    context?: Partial<ChargeEvaluationContext>,
  ): boolean {
    const conditions = rule.conditions as ChargeConditions;

    if (
      conditions.maxCartTotal !== undefined &&
      cartTotal >= conditions.maxCartTotal
    ) {
      return false;
    }

    if (
      conditions.minCartValue !== undefined &&
      cartTotal < conditions.minCartValue
    ) {
      return false;
    }

    if (context?.distanceKm !== undefined) {
      if (
        conditions.minDistanceKm !== undefined &&
        context.distanceKm < conditions.minDistanceKm
      ) {
        return false;
      }
      if (
        conditions.maxDistanceKm !== undefined &&
        context.distanceKm > conditions.maxDistanceKm
      ) {
        return false;
      }
    }

    if (
      context?.zoneId &&
      conditions.zoneId &&
      conditions.zoneId !== context.zoneId
    ) {
      return false;
    }

    return true;
  }

  private computeRuleAmount(rule: ChargeRuleEntity, cartTotal: number): number {
    if (rule.type === ChargeType.FIXED) {
      return parseFloat(rule.value);
    }
    if (rule.type === ChargeType.PERCENTAGE) {
      return (cartTotal * parseFloat(rule.value)) / 100;
    }
    return 0;
  }

  async evaluateChargeLines(
    cartTotal: number,
    context?: Partial<ChargeEvaluationContext>,
  ): Promise<ChargeLineItem[]> {
    const rules = await this.repo.findActiveChargeRules();
    const lines: ChargeLineItem[] = [];

    for (const rule of rules) {
      if (!this.ruleMatches(rule, cartTotal, context)) {
        continue;
      }

      lines.push({
        code: rule.code,
        name: rule.name,
        type: rule.type,
        amount: this.computeRuleAmount(rule, cartTotal),
      });
    }

    return lines;
  }

  async evaluateCharges(
    cartTotal: number,
    context?: Partial<ChargeEvaluationContext>,
  ): Promise<number> {
    const lines = await this.evaluateChargeLines(cartTotal, context);
    return lines.reduce((sum, line) => sum + line.amount, 0);
  }

  async calculateDeliveryFee(
    distanceKm = 3,
    zoneId?: string | null,
  ): Promise<number> {
    const slabs = await this.repo.findActiveDeliverySlabs(zoneId);

    if (slabs.length === 0) {
      return this.calculateDistanceFormulaFee(distanceKm);
    }

    const zoneSlabs = zoneId
      ? slabs.filter((s) => s.zoneId === zoneId || !s.zoneId)
      : slabs.filter((s) => !s.zoneId);

    const applicable = zoneSlabs.length > 0 ? zoneSlabs : slabs;

    const match = applicable.find(
      (s) =>
        distanceKm >= parseFloat(s.minKm) && distanceKm <= parseFloat(s.maxKm),
    );

    if (match) {
      return parseFloat(match.fee);
    }

    return this.calculateDistanceFormulaFee(distanceKm, applicable);
  }

  private calculateDistanceFormulaFee(
    distanceKm: number,
    slabs: DeliveryFeeSlabEntity[] = [],
  ): number {
    if (slabs.length > 0) {
      const lastSlab = slabs[slabs.length - 1];
      const baseFee = parseFloat(lastSlab.fee);
      const overflowKm = Math.max(0, distanceKm - parseFloat(lastSlab.maxKm));
      return baseFee + overflowKm * 5;
    }

    const baseFee = 20;
    const perKmRate = 8;
    return baseFee + Math.max(0, distanceKm - 1) * perKmRate;
  }
}
