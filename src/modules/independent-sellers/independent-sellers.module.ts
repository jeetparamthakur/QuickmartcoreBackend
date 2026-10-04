import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndependentSellerEntity } from './entities/independent-seller.entity';
import { IndependentSellersGeoService } from './independent-sellers-geo.service';

@Module({
  imports: [TypeOrmModule.forFeature([IndependentSellerEntity])],
  providers: [IndependentSellersGeoService],
  exports: [TypeOrmModule, IndependentSellersGeoService],
})
export class IndependentSellersModule {}
