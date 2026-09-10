import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerProfileEntity } from './entities/seller-profile.entity';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { PayoutEntity } from '../payouts/entities/payout.entity';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { KycModule } from '../kyc/kyc.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CategoriesModule } from '../categories/categories.module';
import { CommissionModule } from '../commission/commission.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerProfileEntity,
      StoreOwnerProfileEntity,
      StoreEntity,
      IndependentSellerEntity,
      SubOrderEntity,
      PayoutEntity,
    ]),
    OrdersModule,
    ProductsModule,
    InventoryModule,
    KycModule,
    WalletModule,
    CategoriesModule,
    NotificationsModule,
    CommissionModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
  exports: [TypeOrmModule, SellerService],
})
export class SellersModule {}
