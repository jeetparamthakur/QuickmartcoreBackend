import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreEntity } from './entities/store.entity';
import { StoreOwnerProfileEntity } from './entities/store-owner-profile.entity';
import { StoresController } from './stores.controller';
import { StoresRepository } from './stores.repository';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreEntity, StoreOwnerProfileEntity]),
    ProductsModule,
  ],
  controllers: [StoresController],
  providers: [StoresRepository],
  exports: [StoresRepository],
})
export class StoresModule {}
