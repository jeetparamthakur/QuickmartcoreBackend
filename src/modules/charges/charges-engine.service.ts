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

  async evaluateCharges(cartTotal: number, context?: Partial<ChargeEvaluationContext>): Promise<number> {
    const rules = await this.repo.findActiveChargeRules();
    let total = 0;

    for (const rule of rules) {
      const conditions = rule.conditions as {
        maxCartTotal?: number;
        minDistanceKm?: number;
        maxDistanceKm?: number;
        zoneId?: string;
      };

      if (
        conditions.maxCartTotal !== undefined &&
        cartTotal >= conditions.maxCartTotal
      ) {
        continue;
      }

      if (context?.distanceKm !== undefined) {
        if (
          conditions.minDistanceKm !== undefined &&
          context.distanceKm < conditions.minDistanceKm
        ) {
          continue;
        }
        if (
          conditions.maxDistanceKm !== undefined &&
          context.distanceKm > conditions.maxDistanceKm
        ) {
          continue;
        }
      }

      if (context?.zoneId && conditions.zoneId && conditions.zoneId !== context.zoneId) {
        continue;
      }

      if (rule.type === ChargeType.FIXED) {
        total += parseFloat(rule.value);
      } else if (rule.type === ChargeType.PERCENTAGE) {
        total += (cartTotal * parseFloat(rule.value)) / 100;
      }
    }

    return total;
  }

  async calculateDeliveryFee(distanceKm = 3, zoneId?: string | null): Promise<number> {
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
