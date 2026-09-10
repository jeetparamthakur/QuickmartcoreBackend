import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../modules/users/entities/user.entity';
import { UserSessionEntity } from '../modules/auth/entities/user-session.entity';
import { CustomerProfileEntity } from '../modules/customers/entities/customer-profile.entity';
import { CustomerAddressEntity } from '../modules/customers/entities/customer-address.entity';
import { SellerProfileEntity } from '../modules/sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../modules/stores/entities/store-owner-profile.entity';
import { DeliveryPartnerProfileEntity } from '../modules/delivery-partners/entities/delivery-partner-profile.entity';
import {
  AdminActivityEntity,
  AdminPermissionsEntity,
  AdminProfileEntity,
  RestrictionAuditLogEntity,
} from '../modules/admin/entities/admin-profile.entity';
import { RoleEntity } from '../modules/access-control/entities/role.entity';
import { PermissionEntity } from '../modules/access-control/entities/permission.entity';
import { RolePermissionEntity } from '../modules/access-control/entities/role-permission.entity';
import { UserRoleEntity } from '../modules/access-control/entities/user-role.entity';
import { CategoryEntity } from '../modules/categories/entities/category.entity';
import { MasterProductEntity } from '../modules/products/entities/master-product.entity';
import { ProductVariantEntity } from '../modules/products/entities/product-variant.entity';
import { SellerProductEntity } from '../modules/products/entities/seller-product.entity';
import { StoreEntity } from '../modules/stores/entities/store.entity';
import { IndependentSellerEntity } from '../modules/independent-sellers/entities/independent-seller.entity';
import { InventoryItemEntity } from '../modules/inventory/entities/inventory-item.entity';
import { InventoryReservationEntity } from '../modules/inventory/entities/inventory-reservation.entity';
import { CartEntity } from '../modules/cart/entities/cart.entity';
import { CartItemEntity } from '../modules/cart/entities/cart-item.entity';
import { ParentOrderEntity } from '../modules/orders/entities/parent-order.entity';
import { SubOrderEntity } from '../modules/orders/entities/sub-order.entity';
import { OrderItemEntity } from '../modules/orders/entities/order-item.entity';
import { OrderStatusHistoryEntity } from '../modules/orders/entities/order-status-history.entity';
import {
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
} from '../modules/charges/entities/charge-rule.entity';
import {
  AuditLogEntity,
  IdempotencyKeyEntity,
} from '../modules/audit-logs/entities/audit-log.entity';
import { PaymentEntity } from '../modules/payments/entities/payment.entity';
import { RefundEntity } from '../modules/refunds/entities/refund.entity';
import { LedgerEntryEntity } from '../modules/finance/entities/ledger-entry.entity';
import { DeliveryAssignmentEntity } from '../modules/delivery/entities/delivery-assignment.entity';
import { PartnerLocationEntity } from '../modules/delivery/entities/partner-location.entity';
import { CommissionRuleEntity } from '../modules/commission/entities/commission-rule.entity';
import { PayoutEntity } from '../modules/payouts/entities/payout.entity';
import { WalletEntity } from '../modules/wallet/entities/wallet.entity';
import { WalletTransactionEntity } from '../modules/wallet/entities/wallet-transaction.entity';
import { CouponEntity } from '../modules/coupons/entities/coupon.entity';
import { CouponRedemptionEntity } from '../modules/coupons/entities/coupon-redemption.entity';
import { OfferEntity } from '../modules/offers/entities/offer.entity';
import { BannerEntity } from '../modules/banners/entities/banner.entity';
import { AdvertisementEntity } from '../modules/advertisements/entities/advertisement.entity';
import { NotificationEntity } from '../modules/notifications/entities/notification.entity';
import { FeatureFlagEntity } from '../modules/feature-flags/entities/feature-flag.entity';
import { KycSubmissionEntity } from '../modules/kyc/entities/kyc-submission.entity';
import { KycDocumentEntity } from '../modules/kyc/entities/kyc-document.entity';
import { StoreStaffEntity } from '../modules/staff/entities/store-staff.entity';

export const ALL_ENTITIES = [
  UserEntity,
  UserSessionEntity,
  CustomerProfileEntity,
  CustomerAddressEntity,
  SellerProfileEntity,
  StoreOwnerProfileEntity,
  DeliveryPartnerProfileEntity,
  AdminProfileEntity,
  AdminPermissionsEntity,
  AdminActivityEntity,
  RestrictionAuditLogEntity,
  RoleEntity,
  PermissionEntity,
  RolePermissionEntity,
  UserRoleEntity,
  CategoryEntity,
  MasterProductEntity,
  ProductVariantEntity,
  SellerProductEntity,
  StoreEntity,
  IndependentSellerEntity,
  InventoryItemEntity,
  InventoryReservationEntity,
  CartEntity,
  CartItemEntity,
  ParentOrderEntity,
  SubOrderEntity,
  OrderItemEntity,
  OrderStatusHistoryEntity,
  ChargeRuleEntity,
  DeliveryFeeSlabEntity,
  AuditLogEntity,
  IdempotencyKeyEntity,
  PaymentEntity,
  RefundEntity,
  LedgerEntryEntity,
  DeliveryAssignmentEntity,
  PartnerLocationEntity,
  CommissionRuleEntity,
  PayoutEntity,
  WalletEntity,
  WalletTransactionEntity,
  CouponEntity,
  CouponRedemptionEntity,
  OfferEntity,
  BannerEntity,
  AdvertisementEntity,
  NotificationEntity,
  FeatureFlagEntity,
  KycSubmissionEntity,
  KycDocumentEntity,
  StoreStaffEntity,
];

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('databaseUrl'),
        entities: ALL_ENTITIES,
        synchronize: config.get<string>('nodeEnv') !== 'production',
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
  ],
})
export class DatabaseModule {}
