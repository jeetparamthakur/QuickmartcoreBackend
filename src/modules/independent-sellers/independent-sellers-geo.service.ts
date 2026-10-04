import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IndependentSellerEntity } from './entities/independent-seller.entity';
import { IndependentSellerStatus } from '../../common/enums';

export type NearbySellerDto = {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
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

@Injectable()
export class IndependentSellersGeoService {
  constructor(
    @InjectRepository(IndependentSellerEntity)
    private readonly sellerRepo: Repository<IndependentSellerEntity>,
  ) {}

  async findNearby(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbySellerDto[]> {
    const sellers = await this.sellerRepo.find({
      where: { status: IndependentSellerStatus.ACTIVE },
    });

    const results: NearbySellerDto[] = [];

    for (const seller of sellers) {
      if (seller.pickupLat == null || seller.pickupLng == null) continue;
      const sellerLat = Number(seller.pickupLat);
      const sellerLng = Number(seller.pickupLng);
      if (!Number.isFinite(sellerLat) || !Number.isFinite(sellerLng)) continue;

      const distanceKm = haversineKm(lat, lng, sellerLat, sellerLng);
      if (distanceKm > radiusKm) continue;

      results.push({
        id: seller.id,
        businessName: seller.businessName,
        latitude: sellerLat,
        longitude: sellerLng,
        distanceKm: Math.round(distanceKm * 100) / 100,
      });
    }

    results.sort((a, b) => a.distanceKm - b.distanceKm);
    return results;
  }
}
