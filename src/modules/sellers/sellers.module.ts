import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerProfileEntity } from './entities/seller-profile.entity';
import { SellerController } from './seller.controller';
import { SellerService } from './seller.service';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerProfileEntity,
      StoreOwnerProfileEntity,
      StoreEntity,
      IndependentSellerEntity,
      SubOrderEntity,
    ]),
    OrdersModule,
    ProductsModule,
    InventoryModule,
  ],
  controllers: [SellerController],
  providers: [SellerService],
  exports: [TypeOrmModule, SellerService],
})
export class SellersModule {}
