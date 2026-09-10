import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import {
  UserType,
  UserStatus,
  SellerType,
  StoreStatus,
  IndependentSellerStatus,
  InventoryStatus,
  ChargeType,
  CommissionRuleType,
  CouponCreatedByType,
  CouponFundingSource,
  CouponScopeType,
  CouponType,
  OfferStatus,
  BannerPlacement,
} from '../src/common/enums';
import { CategoryEntity } from '../src/modules/categories/entities/category.entity';
import { MasterProductEntity } from '../src/modules/products/entities/master-product.entity';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { StoreOwnerProfileEntity } from '../src/modules/stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../src/modules/stores/entities/store.entity';
import { SellerProfileEntity } from '../src/modules/sellers/entities/seller-profile.entity';
import { IndependentSellerEntity } from '../src/modules/independent-sellers/entities/independent-seller.entity';
import { SellerProductEntity } from '../src/modules/products/entities/seller-product.entity';
import { InventoryItemEntity } from '../src/modules/inventory/entities/inventory-item.entity';
import {
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
} from '../src/modules/charges/entities/charge-rule.entity';
import { AdminProfileEntity } from '../src/modules/admin/entities/admin-profile.entity';
import { CommissionRuleEntity } from '../src/modules/commission/entities/commission-rule.entity';
import { CouponEntity } from '../src/modules/coupons/entities/coupon.entity';
import { OfferEntity } from '../src/modules/offers/entities/offer.entity';
import { BannerEntity } from '../src/modules/banners/entities/banner.entity';
import { RoleEntity } from '../src/modules/access-control/entities/role.entity';
import { UserRoleEntity } from '../src/modules/access-control/entities/user-role.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);

  const category = await ds.getRepository(CategoryEntity).save({
    name: 'Groceries',
    slug: 'groceries',
    sortOrder: 1,
    isActive: true,
  });

  const masterProduct = await ds.getRepository(MasterProductEntity).save({
    categoryId: category.id,
    name: 'Organic Milk 1L',
    description: 'Fresh organic milk',
    brand: 'FarmFresh',
    baseUnit: 'ltr',
    attributes: {},
  });

  const storeOwnerUser = await ds.getRepository(UserEntity).save({
    email: 'storeowner@m3bd.test',
    passwordHash: await argon2.hash('password123'),
    userType: UserType.STORE_OWNER,
    status: UserStatus.ACTIVE,
  });

  const storeOwnerProfile = await ds.getRepository(StoreOwnerProfileEntity).save({
    userId: storeOwnerUser.id,
    fullName: 'Store Owner One',
  });

  const store = await ds.getRepository(StoreEntity).save({
    storeOwnerId: storeOwnerProfile.id,
    name: 'Fresh Mart',
    address: '123 Main St',
    lat: '28.6139',
    lng: '77.2090',
    serviceRadiusKm: '5',
    status: StoreStatus.ACTIVE,
  });

  const sellerUser = await ds.getRepository(UserEntity).save({
    email: 'seller@m3bd.test',
    passwordHash: await argon2.hash('password123'),
    userType: UserType.SELLER,
    status: UserStatus.ACTIVE,
  });

  const sellerProfile = await ds.getRepository(SellerProfileEntity).save({
    userId: sellerUser.id,
    businessName: 'Homemade Bakes',
  });

  const independentSeller = await ds.getRepository(IndependentSellerEntity).save({
    sellerProfileId: sellerProfile.id,
    businessName: 'Homemade Bakes',
    pickupLat: '28.6200',
    pickupLng: '77.2100',
    status: IndependentSellerStatus.ACTIVE,
  });

  const storeProduct = await ds.getRepository(SellerProductEntity).save({
    sellerType: SellerType.STORE,
    storeId: store.id,
    masterProductId: masterProduct.id,
    title: 'Organic Milk 1L - Fresh Mart',
    mrp: '80.00',
    sellingPrice: '70.00',
    isActive: true,
  });

  const independentProduct = await ds.getRepository(SellerProductEntity).save({
    sellerType: SellerType.INDEPENDENT,
    independentSellerId: independentSeller.id,
    masterProductId: masterProduct.id,
    title: 'Organic Milk 1L - Homemade Bakes',
    mrp: '85.00',
    sellingPrice: '75.00',
    isActive: true,
  });

  await ds.getRepository(InventoryItemEntity).save([
    {
      sellerProductId: storeProduct.id,
      quantityAvailable: 100,
      quantityReserved: 0,
      status: InventoryStatus.AVAILABLE,
    },
    {
      sellerProductId: independentProduct.id,
      quantityAvailable: 50,
      quantityReserved: 0,
      status: InventoryStatus.AVAILABLE,
    },
  ]);

  await ds.getRepository(ChargeRuleEntity).save({
    code: 'PLATFORM_FEE',
    name: 'Platform Fee',
    type: ChargeType.FIXED,
    value: '10.00',
    conditions: {},
    priority: 1,
    isActive: true,
  });

  await ds.getRepository(ChargeRuleEntity).save({
    code: 'SMALL_ORDER_FEE',
    name: 'Small Order Fee',
    type: ChargeType.FIXED,
    value: '20.00',
    conditions: { maxCartTotal: 200 },
    priority: 2,
    isActive: true,
  });

  await ds.getRepository(ChargeRuleEntity).save({
    code: 'HANDLING_FEE',
    name: 'Handling Fee',
    type: ChargeType.FIXED,
    value: '15.00',
    conditions: {},
    priority: 3,
    isActive: true,
  });

  await ds.getRepository(DeliveryFeeSlabEntity).save({
    minKm: '0',
    maxKm: '2',
    fee: '20.00',
    isActive: true,
  });

  await ds.getRepository(DeliveryFeeSlabEntity).save({
    minKm: '2',
    maxKm: '5',
    fee: '30.00',
    isActive: true,
  });

  const superAdminUser = await ds.getRepository(UserEntity).save({
    email: 'superadmin@platform.com',
    passwordHash: await argon2.hash('superadmin123'),
    userType: UserType.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  });

  await ds.getRepository(AdminProfileEntity).save({
    userId: superAdminUser.id,
    fullName: 'Super Admin',
    isSuperAdmin: true,
    loginEnabled: true,
  });

  const adminUser = await ds.getRepository(UserEntity).save({
    email: 'admin@m3bd.test',
    passwordHash: await argon2.hash('admin123'),
    userType: UserType.ADMIN,
    status: UserStatus.ACTIVE,
  });

  await ds.getRepository(AdminProfileEntity).save({
    userId: adminUser.id,
    fullName: 'Platform Admin',
    isSuperAdmin: false,
    loginEnabled: true,
  });

  const assignPanelRole = async (userId: string, roleName: UserType) => {
    const role = await ds.getRepository(RoleEntity).findOne({ where: { name: roleName } });
    if (!role) return;
    const existing = await ds.getRepository(UserRoleEntity).findOne({
      where: { userId, roleId: role.id },
    });
    if (existing) return;
    await ds.getRepository(UserRoleEntity).save({ userId, roleId: role.id });
  };

  await assignPanelRole(superAdminUser.id, UserType.SUPER_ADMIN);
  await assignPanelRole(adminUser.id, UserType.ADMIN);

  await ds.getRepository(CommissionRuleEntity).save([
    {
      code: 'STORE_COMMISSION',
      name: 'Store Seller Commission',
      type: CommissionRuleType.PERCENTAGE,
      value: '10.0000',
      sellerType: SellerType.STORE,
      effectiveFrom: '2024-01-01',
      conditions: {},
      priority: 1,
      isActive: true,
    },
    {
      code: 'INDEPENDENT_COMMISSION',
      name: 'Independent Seller Commission',
      type: CommissionRuleType.PERCENTAGE,
      value: '15.0000',
      sellerType: SellerType.INDEPENDENT,
      effectiveFrom: '2024-01-01',
      conditions: {},
      priority: 2,
      isActive: true,
    },
    {
      code: 'MIN_ORDER_COMMISSION',
      name: 'Minimum Order Commission',
      type: CommissionRuleType.FIXED,
      value: '5.0000',
      effectiveFrom: '2024-01-01',
      conditions: { minOrderAmount: 100 },
      priority: 3,
      isActive: true,
    },
  ]);

  await ds.getRepository(CouponEntity).save([
    {
      code: 'WELCOME10',
      name: 'Welcome 10% Off',
      type: CouponType.PERCENTAGE,
      value: '10.0000',
      minOrderAmount: '199.00',
      maxDiscount: '100.00',
      usageLimit: 1000,
      perCustomerLimit: 1,
      scopeType: CouponScopeType.GLOBAL,
      fundingSource: CouponFundingSource.PLATFORM,
      createdByType: CouponCreatedByType.ADMIN,
      isActive: true,
    },
    {
      code: 'FRESH50',
      name: 'Fresh Mart ₹50 Off',
      type: CouponType.FIXED,
      value: '50.0000',
      minOrderAmount: '300.00',
      usageLimit: 500,
      perCustomerLimit: 2,
      scopeType: CouponScopeType.STORE,
      storeId: store.id,
      fundingSource: CouponFundingSource.SELLER,
      createdByType: CouponCreatedByType.ADMIN,
      isActive: true,
    },
    {
      code: 'BAKES20',
      name: 'Homemade Bakes 20% Off',
      type: CouponType.PERCENTAGE,
      value: '20.0000',
      minOrderAmount: '150.00',
      maxDiscount: '80.00',
      usageLimit: 200,
      perCustomerLimit: 1,
      scopeType: CouponScopeType.INDEPENDENT_SELLER,
      independentSellerId: independentSeller.id,
      fundingSource: CouponFundingSource.SELLER,
      createdByType: CouponCreatedByType.SELLER,
      createdByUserId: sellerUser.id,
      isActive: true,
    },
  ]);

  await ds.getRepository(OfferEntity).save({
    title: 'Welcome Offer',
    description: 'Get 10% off your first order with code WELCOME10',
    discountPercent: '10.00',
    linkedCouponCode: 'WELCOME10',
    status: OfferStatus.ACTIVE,
  });

  await ds.getRepository(BannerEntity).save([
    {
      title: 'Fresh Groceries Delivered',
      imageUrl: 'https://picsum.photos/seed/banner-home/800/300',
      linkUrl: `/category/${category.id}`,
      placement: BannerPlacement.HOME_TOP,
      sortOrder: 0,
      isActive: true,
    },
    {
      title: 'Weekend Deals',
      imageUrl: 'https://picsum.photos/seed/banner-middle/800/300',
      placement: BannerPlacement.HOME_MIDDLE,
      sortOrder: 1,
      isActive: true,
    },
    {
      title: 'Partner Updates',
      imageUrl: 'https://picsum.photos/seed/banner-partner/800/300',
      placement: BannerPlacement.HOME_MIDDLE,
      sortOrder: 2,
      isActive: true,
    },
  ]);

  console.log('Seed completed successfully');
  console.log('Store product ID:', storeProduct.id);
  console.log('Independent product ID:', independentProduct.id);

  await app.close();
}

void seed();
