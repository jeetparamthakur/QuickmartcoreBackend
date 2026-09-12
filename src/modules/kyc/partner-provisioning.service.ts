import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IndependentSellerStatus,
  PartnerType,
  SellerType,
  StoreStatus,
  UserType,
} from '../../common/enums';
import { ProductsRepository } from '../products/products.repository';
import { InventoryRepository } from '../inventory/inventory.service';
import { CategoriesRepository } from '../categories/categories.repository';
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
    private readonly productsRepo: ProductsRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly categoriesRepo: CategoriesRepository,
  ) {}

  async provisionForUser(userId: string, activate = false) {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType === PartnerType.STORE) {
      await this.provisionStorePartner(userId, seller, activate);
      return;
    }

    if (seller?.partnerType === PartnerType.FOOD_STORE) {
      await this.provisionFoodStorePartner(userId, seller, activate);
      return;
    }

    if (seller?.partnerType === PartnerType.INDEPENDENT_SELLER) {
      await this.provisionIndependentSeller(seller, activate);
      return;
    }

    const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
    if (owner) {
      const store = await this.ensureStoreFromOwnerProfile(owner, activate);
      if (activate && owner.partnerType === PartnerType.FOOD_STORE) {
        await this.provisionFoodItemsFromProfile(owner, store);
      }
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

  private async provisionFoodStorePartner(
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
          partnerType: PartnerType.FOOD_STORE,
          onboardingStep: seller.onboardingStep,
          approvalStatus: seller.approvalStatus,
          businessDetails: seller.businessDetails,
          foodSetup: seller.foodSetup,
          bankDetails: seller.bankDetails,
        }),
      );

      const user = await this.usersRepo.findById(userId);
      if (user && user.userType === UserType.SELLER) {
        await this.usersRepo.update(userId, { userType: UserType.STORE_OWNER });
      }
    } else {
      owner.businessDetails = seller.businessDetails ?? owner.businessDetails;
      owner.foodSetup = seller.foodSetup ?? owner.foodSetup;
      owner.bankDetails = seller.bankDetails ?? owner.bankDetails;
      owner.onboardingStep = seller.onboardingStep;
      owner.approvalStatus = seller.approvalStatus;
      owner.partnerType = PartnerType.FOOD_STORE;
      await this.storeOwnerProfiles.save(owner);
    }

    const store = await this.ensureStoreFromOwnerProfile(owner, activate);
    if (activate) {
      await this.provisionFoodItemsFromProfile(owner, store);
    }
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

    const locationDetails = this.resolveLocationDetails(owner);
    const businessDetails = (owner.businessDetails ?? {}) as Record<
      string,
      unknown
    >;
    const name =
      this.readString(locationDetails, 'name') ??
      this.readString(businessDetails, 'storeName') ??
      owner.fullName;

    if (!name) return null;

    const latitude = this.readNumber(locationDetails, 'latitude');
    const longitude = this.readNumber(locationDetails, 'longitude');
    const deliveryRadius =
      this.readNumber(locationDetails, 'deliveryRadius') ?? 5;

    return this.stores.save(
      this.stores.create({
        storeOwnerId: owner.id,
        name,
        address: this.formatAddress(locationDetails),
        lat: latitude !== null ? String(latitude) : null,
        lng: longitude !== null ? String(longitude) : null,
        serviceRadiusKm: String(deliveryRadius),
        details: locationDetails,
        status: activate ? StoreStatus.ACTIVE : StoreStatus.INACTIVE,
      }),
    );
  }

  private resolveLocationDetails(owner: StoreOwnerProfileEntity) {
    const foodSetup = (owner.foodSetup ?? {}) as Record<string, unknown>;
    const storeDetails = (owner.storeDetails ?? {}) as Record<string, unknown>;
    if (owner.partnerType === PartnerType.FOOD_STORE && Object.keys(foodSetup).length > 0) {
      return foodSetup;
    }
    return storeDetails;
  }

  private async provisionFoodItemsFromProfile(
    owner: StoreOwnerProfileEntity,
    store: StoreEntity | null,
  ) {
    if (!store) return;

    const foodSetup = (owner.foodSetup ?? {}) as Record<string, unknown>;
    if (foodSetup.itemsProvisioned === true) return;

    const items = foodSetup.items;
    if (!Array.isArray(items) || items.length === 0) return;

    const existingProducts = await this.productsRepo.findByStoreId(store.id);
    if (existingProducts.length > 0) {
      owner.foodSetup = { ...foodSetup, itemsProvisioned: true };
      await this.storeOwnerProfiles.save(owner);
      return;
    }

    const categoryId = await this.resolveFoodCategoryId();

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const name = this.readString(record, 'name');
      const price = this.readNumber(record, 'price');
      if (!name || price === null || price <= 0) continue;

      const description = this.readString(record, 'description') ?? '';
      const isVeg = record.isVeg === true;
      const prepTimeMinutes = this.readNumber(record, 'prepTimeMinutes') ?? 15;
      const imageUrl = this.readString(record, 'imageUrl');
      const images = imageUrl ? [imageUrl] : [];

      const masterProduct = await this.productsRepo.createMasterProduct({
        categoryId,
        name,
        description,
        brand: null,
        baseUnit: 'serving',
        attributes: {
          productType: 'food',
          isVeg,
          prepTimeMinutes,
          images,
          status: 'active',
          categoryLabel: 'Food',
        },
      });

      const sellerProduct = await this.productsRepo.createSellerProduct({
        sellerType: SellerType.STORE,
        storeId: store.id,
        masterProductId: masterProduct.id,
        title: name,
        mrp: price.toFixed(2),
        sellingPrice: price.toFixed(2),
        isActive: true,
      });

      await this.inventoryRepo.upsertQuantity(sellerProduct.id, 999);
    }

    owner.foodSetup = { ...foodSetup, itemsProvisioned: true };
    await this.storeOwnerProfiles.save(owner);

    const seller = await this.sellerProfiles.findOne({
      where: { userId: owner.userId },
    });
    if (seller) {
      seller.foodSetup = owner.foodSetup;
      await this.sellerProfiles.save(seller);
    }
  }

  private async resolveFoodCategoryId() {
    const existing = await this.categoriesRepo.findBySlug('food');
    if (existing) return existing.id;

    const created = await this.categoriesRepo.create({
      name: 'Food',
      slug: 'food',
      sortOrder: 0,
      isActive: true,
    });
    return created.id;
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
