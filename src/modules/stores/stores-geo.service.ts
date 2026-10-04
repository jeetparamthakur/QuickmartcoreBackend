import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';
import { PartnerType, StoreStatus } from '../../common/enums';
import type { StoreOwnerProfileEntity } from './entities/store-owner-profile.entity';

export type NearbyStoreDto = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
  partnerType: string;
  ownerLabel?: string;
  serviceRadiusKm: number;
  deliveryMinutes?: number;
  status: string;
};

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ownerLabelFromProfile(owner: StoreOwnerProfileEntity): string | undefined {
  const foodSetup = owner.foodSetup as { name?: string } | null | undefined;
  if (foodSetup?.name) return foodSetup.name;
  const business = owner.businessDetails as { businessName?: string; name?: string } | null;
  if (business?.businessName) return business.businessName;
  if (business?.name) return business.name;
  return owner.fullName || undefined;
}

@Injectable()
export class StoresGeoService {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly storeRepo: Repository<StoreEntity>,
  ) {}

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    partnerType?: PartnerType,
  ): Promise<NearbyStoreDto[]> {
    const stores = await this.storeRepo.find({
      where: { status: StoreStatus.ACTIVE },
      relations: ['storeOwner'],
    });

    const results: NearbyStoreDto[] = [];

    for (const store of stores) {
      if (store.lat == null || store.lng == null) continue;
      const storeLat = Number(store.lat);
      const storeLng = Number(store.lng);
      if (!Number.isFinite(storeLat) || !Number.isFinite(storeLng)) continue;

      const distanceKm = haversineKm(lat, lng, storeLat, storeLng);
      if (distanceKm > radiusKm) continue;

      const owner = store.storeOwner;
      const resolvedPartnerType = owner?.partnerType ?? PartnerType.STORE;
      if (partnerType && resolvedPartnerType !== partnerType) continue;

      const serviceRadiusKm = Number(store.serviceRadiusKm);
      if (serviceRadiusKm > 0 && distanceKm > serviceRadiusKm) continue;

      const details = (store.details as { deliveryMinutes?: number } | null) ?? {};
      const deliveryMinutes =
        typeof details.deliveryMinutes === 'number'
          ? details.deliveryMinutes
          : undefined;

      results.push({
        id: store.id,
        name: store.name,
        address: store.address ?? null,
        latitude: storeLat,
        longitude: storeLng,
        distanceKm: Math.round(distanceKm * 100) / 100,
        partnerType: resolvedPartnerType,
        ownerLabel: owner ? ownerLabelFromProfile(owner) : undefined,
        serviceRadiusKm: Number.isFinite(serviceRadiusKm) ? serviceRadiusKm : 5,
        deliveryMinutes,
        status: store.status,
      });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results;
  }
}
