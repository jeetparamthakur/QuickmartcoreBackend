import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { PartnerLocationEntity } from './entities/partner-location.entity';

const LOCATION_RATE_LIMIT_MS = 10_000;

@Injectable()
export class DeliveryTrackingRepository {
  constructor(
    @InjectRepository(PartnerLocationEntity)
    private readonly locations: Repository<PartnerLocationEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly partners: Repository<DeliveryPartnerProfileEntity>,
  ) {}

  getLatestLocation(partnerProfileId: string) {
    return this.locations.findOne({
      where: { partnerProfileId },
      order: { recordedAt: 'DESC' },
    });
  }

  getRecentLocation(partnerProfileId: string, since: Date) {
    return this.locations
      .findOne({
        where: { partnerProfileId },
        order: { recordedAt: 'DESC' },
      })
      .then((loc) => (loc && loc.recordedAt >= since ? loc : null));
  }

  saveLocation(data: Partial<PartnerLocationEntity>) {
    return this.locations.save(this.locations.create(data));
  }

  updatePartnerCurrentLocation(
    partnerProfileId: string,
    lat: string,
    lng: string,
  ) {
    return this.partners.update(partnerProfileId, {
      currentLat: lat,
      currentLng: lng,
    });
  }

  setOnlineStatus(partnerProfileId: string, isOnline: boolean) {
    return this.partners.update(partnerProfileId, { isOnline });
  }
}

@Injectable()
export class DeliveryTrackingService {
  constructor(private readonly repo: DeliveryTrackingRepository) {}

  async updateLocation(partnerProfileId: string, lat: string, lng: string) {
    const since = new Date(Date.now() - LOCATION_RATE_LIMIT_MS);
    const recent = await this.repo.getRecentLocation(partnerProfileId, since);
    if (recent) {
      return { rateLimited: true, location: recent };
    }

    const location = await this.repo.saveLocation({
      partnerProfileId,
      lat,
      lng,
      recordedAt: new Date(),
    });

    await this.repo.updatePartnerCurrentLocation(partnerProfileId, lat, lng);

    return { rateLimited: false, location };
  }

  getCurrentLocation(partnerProfileId: string) {
    return this.repo.getLatestLocation(partnerProfileId);
  }

  setOnlineStatus(partnerProfileId: string, isOnline: boolean) {
    return this.repo.setOnlineStatus(partnerProfileId, isOnline);
  }
}
