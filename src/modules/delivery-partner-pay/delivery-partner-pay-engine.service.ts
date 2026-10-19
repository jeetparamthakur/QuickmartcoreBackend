import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeliveryPartnerPaySlabEntity } from './entities/delivery-partner-pay-slab.entity';
import { calculatePartnerPayFromSlabs } from './delivery-partner-pay-slab.util';

@Injectable()
export class DeliveryPartnerPayEngineService {
  constructor(
    @InjectRepository(DeliveryPartnerPaySlabEntity)
    private readonly slabs: Repository<DeliveryPartnerPaySlabEntity>,
  ) {}

  async findActiveSlabs(partnerProfileId?: string | null, zoneId?: string | null) {
    if (partnerProfileId) {
      const partnerSlabs = await this.slabs.find({
        where: { partnerProfileId, isActive: true },
        order: { minKm: 'ASC' },
      });
      if (partnerSlabs.length > 0) {
        return this.filterByZone(partnerSlabs, zoneId);
      }
    }

    const globalSlabs = await this.slabs.find({
      where: { partnerProfileId: IsNull(), isActive: true },
      order: { minKm: 'ASC' },
    });
    return this.filterByZone(globalSlabs, zoneId);
  }

  private filterByZone(
    slabs: DeliveryPartnerPaySlabEntity[],
    zoneId?: string | null,
  ) {
    if (!zoneId) {
      return slabs.filter((s) => !s.zoneId);
    }
    const zoneSlabs = slabs.filter((s) => s.zoneId === zoneId || !s.zoneId);
    return zoneSlabs.length > 0 ? zoneSlabs : slabs;
  }

  async calculatePartnerPay(
    partnerProfileId: string,
    distanceKm: number,
    zoneId?: string | null,
  ): Promise<number> {
    const applicable = await this.findActiveSlabs(partnerProfileId, zoneId);
    return calculatePartnerPayFromSlabs(distanceKm, applicable);
  }
}
