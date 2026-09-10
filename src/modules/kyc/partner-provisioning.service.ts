import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IndependentSellerStatus,
  PartnerType,
  StoreStatus,
  UserType,
} from '../../common/enums';
import { USERS_REPOSITORY } from '../users/users.repository.port';
import type { UsersRepositoryPort } from '../users/users.repository.port';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';

@Injectable()
export class PartnerProvisioningService {
  constructor(
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
    @Inject(USERS_REPOSITORY)
    private readonly usersRepo: UsersRepositoryPort,
  ) {}

  async provisionForUser(userId: string, activate = false) {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType === PartnerType.STORE) {
      await this.provisionStorePartner(userId, seller, activate);
      return;
    }

    if (seller?.partnerType === PartnerType.INDEPENDENT_SELLER) {
      await this.provisionIndependentSeller(seller, activate);
      return;
    }

    const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
    if (owner) {
      await this.ensureStoreFromOwnerProfile(owner, activate);
    }
  }

  async activateForUser(userId: string) {
    await this.provisionForUser(userId, true);
  }

  async syncIndependentSellerFromSetup(
    sellerProfileId: string,
    sellerSetup: Record<string, unknown>,
  ) {
    const existing = await this.independentSellers.findOne({
      where: { sellerProfileId },
    });
    if (!existing) return null;

    const latitude = this.readNumber(sellerSetup, 'latitude');
    const longitude = this.readNumber(sellerSetup, 'longitude');
    const businessName =
      this.readString(sellerSetup, 'shopName') ??
      this.readString(sellerSetup, 'sellerName');

    if (businessName) existing.businessName = businessName;
    if (latitude !== null) existing.pickupLat = String(latitude);
    if (longitude !== null) existing.pickupLng = String(longitude);

    return this.independentSellers.save(existing);
  }

  private async provisionStorePartner(
    userId: string,
    seller: SellerProfileEntity,
    activate: boolean,
  ) {
    let owner = await this.storeOwnerProfiles.findOne({ where: { userId } });

    if (!owner) {
      owner = await this.storeOwnerProfiles.save(
        this.storeOwnerProfiles.create({
          userId,
          fullName:
            this.readString(seller.businessDetails, 'fullName') ??
            seller.businessName,
          partnerType: PartnerType.STORE,
          onboardingStep: seller.onboardingStep,
          approvalStatus: seller.approvalStatus,
          businessDetails: seller.businessDetails,
          storeDetails: seller.storeDetails,
          bankDetails: seller.bankDetails,
        }),
      );

      const user = await this.usersRepo.findById(userId);
      if (user && user.userType === UserType.SELLER) {
        await this.usersRepo.update(userId, { userType: UserType.STORE_OWNER });
      }
    } else {
      owner.businessDetails = seller.businessDetails ?? owner.businessDetails;
      owner.storeDetails = seller.storeDetails ?? owner.storeDetails;
      owner.bankDetails = seller.bankDetails ?? owner.bankDetails;
      owner.onboardingStep = seller.onboardingStep;
      owner.approvalStatus = seller.approvalStatus;
      await this.storeOwnerProfiles.save(owner);
    }

    await this.ensureStoreFromOwnerProfile(owner, activate);
  }

  private async ensureStoreFromOwnerProfile(
    owner: StoreOwnerProfileEntity,
    activate: boolean,
  ) {
    const existing = await this.stores.findOne({
      where: { storeOwnerId: owner.id },
    });
    if (existing) {
      if (activate && existing.status !== StoreStatus.ACTIVE) {
        existing.status = StoreStatus.ACTIVE;
        await this.stores.save(existing);
      }
      return existing;
    }

    const storeDetails = (owner.storeDetails ?? {}) as Record<string, unknown>;
    const businessDetails = (owner.businessDetails ?? {}) as Record<
      string,
      unknown
    >;
    const name =
      this.readString(storeDetails, 'name') ??
      this.readString(businessDetails, 'storeName') ??
      owner.fullName;

    if (!name) return null;

    const latitude = this.readNumber(storeDetails, 'latitude');
    const longitude = this.readNumber(storeDetails, 'longitude');
    const deliveryRadius = this.readNumber(storeDetails, 'deliveryRadius') ?? 5;

    return this.stores.save(
      this.stores.create({
        storeOwnerId: owner.id,
        name,
        address: this.formatAddress(storeDetails),
        lat: latitude !== null ? String(latitude) : null,
        lng: longitude !== null ? String(longitude) : null,
        serviceRadiusKm: String(deliveryRadius),
        details: storeDetails,
        status: activate ? StoreStatus.ACTIVE : StoreStatus.INACTIVE,
      }),
    );
  }

  private async provisionIndependentSeller(
    seller: SellerProfileEntity,
    activate: boolean,
  ) {
    const existing = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (existing) {
      if (activate && existing.status !== IndependentSellerStatus.ACTIVE) {
        existing.status = IndependentSellerStatus.ACTIVE;
        await this.independentSellers.save(existing);
      }
      return existing;
    }

    const setup = (seller.sellerSetup ?? {}) as Record<string, unknown>;
    const business = (seller.businessDetails ?? {}) as Record<string, unknown>;
    const businessName =
      this.readString(setup, 'shopName') ??
      this.readString(setup, 'sellerName') ??
      this.readString(business, 'businessName') ??
      seller.businessName;

    const latitude = this.readNumber(setup, 'latitude');
    const longitude = this.readNumber(setup, 'longitude');

    return this.independentSellers.save(
      this.independentSellers.create({
        sellerProfileId: seller.id,
        businessName,
        pickupLat: latitude !== null ? String(latitude) : null,
        pickupLng: longitude !== null ? String(longitude) : null,
        status: activate
          ? IndependentSellerStatus.ACTIVE
          : IndependentSellerStatus.PENDING,
      }),
    );
  }

  private formatAddress(details: Record<string, unknown>) {
    const parts = [
      this.readString(details, 'address'),
      this.readString(details, 'area'),
      this.readString(details, 'city'),
      this.readString(details, 'pincode'),
    ].filter(Boolean);
    return parts.join(', ').slice(0, 500) || null;
  }

  private readString(source: object | null | undefined, key: string) {
    const value = (source as Record<string, unknown> | null | undefined)?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readNumber(source: object | null | undefined, key: string) {
    const value = (source as Record<string, unknown> | null | undefined)?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
