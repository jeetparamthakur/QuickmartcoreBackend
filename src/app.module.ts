import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { OtpModule } from './modules/otp/otp.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { IndependentSellersModule } from './modules/independent-sellers/independent-sellers.module';
import { DeliveryPartnersModule } from './modules/delivery-partners/delivery-partners.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlatformModule } from './modules/platform/platform.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CartModule } from './modules/cart/cart.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ChargesModule } from './modules/charges/charges.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinanceModule } from './modules/finance/finance.module';
import { RefundsModule } from './modules/refunds/refunds.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { CommissionModule } from './modules/commission/commission.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { OffersModule } from './modules/offers/offers.module';
import { BannersModule } from './modules/banners/banners.module';
import { AdvertisementsModule } from './modules/advertisements/advertisements.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReportsModule } from './modules/reports/reports.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { KycModule } from './modules/kyc/kyc.module';
import { StaffModule } from './modules/staff/staff.module';
import { JobsModule } from './jobs/jobs.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ...(process.env.SKIP_DB === 'true' ? [] : [DatabaseModule]),
    HealthModule,
    UsersModule,
    CustomersModule,
    AccessControlModule,
    AuthModule,
    OtpModule,
    CategoriesModule,
    ProductsModule,
    StoresModule,
    SellersModule,
    IndependentSellersModule,
    DeliveryPartnersModule,
    AdminModule,
    PlatformModule,
    InventoryModule,
    CartModule,
    ChargesModule,
    PricingModule,
    OrdersModule,
    CheckoutModule,
    AuditLogsModule,
    PaymentsModule,
    FinanceModule,
    RefundsModule,
    DeliveryModule,
    CommissionModule,
    PayoutsModule,
    WalletModule,
    CouponsModule,
    OffersModule,
    BannersModule,
    AdvertisementsModule,
    NotificationsModule,
    AnalyticsModule,
    FeatureFlagsModule,
    FileUploadModule,
    KycModule,
    StaffModule,
    ...(process.env.SKIP_DB === 'true' ? [] : [JobsModule]),
    ...(process.env.SKIP_DB === 'true' ? [] : [ReportsModule]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
