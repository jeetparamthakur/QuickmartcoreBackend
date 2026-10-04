import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerAddressEntity } from './entities/customer-address.entity';
import { CustomerWishlistItemEntity } from './entities/customer-wishlist-item.entity';
import { CustomersRepository } from './customers.repository';
import { CUSTOMERS_REPOSITORY } from './customers.repository.port';
import { CustomerAddressesController } from './customer-addresses.controller';
import { CustomerProfileController } from './customer-profile.controller';
import { CustomerWishlistController } from './customer-wishlist.controller';
import { CustomerWishlistService } from './customer-wishlist.service';
import { CustomerWishlistRepository } from './customer-wishlist.repository';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerProfileEntity,
      CustomerAddressEntity,
      CustomerWishlistItemEntity,
    ]),
    ProductsModule,
  ],
  controllers: [
    CustomerAddressesController,
    CustomerProfileController,
    CustomerWishlistController,
  ],
  providers: [
    { provide: CUSTOMERS_REPOSITORY, useClass: CustomersRepository },
    CustomerWishlistRepository,
    CustomerWishlistService,
  ],
  exports: [CUSTOMERS_REPOSITORY],
})
export class CustomersModule {}
