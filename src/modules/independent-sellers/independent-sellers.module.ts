import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndependentSellerEntity } from './entities/independent-seller.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IndependentSellerEntity])],
  exports: [TypeOrmModule],
})
export class IndependentSellersModule {}
