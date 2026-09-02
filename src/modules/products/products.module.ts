import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerProductEntity } from './entities/seller-product.entity';
import { MasterProductEntity } from './entities/master-product.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerProductEntity,
      MasterProductEntity,
      ProductVariantEntity,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsRepository, ProductsService],
})
export class ProductsModule {}
