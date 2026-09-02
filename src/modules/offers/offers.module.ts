import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfferEntity } from './entities/offer.entity';
import { OffersService, OffersRepository } from './offers.service';
import { OffersAdminController } from './offers-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OfferEntity])],
  controllers: [OffersAdminController],
  providers: [OffersService, OffersRepository],
  exports: [OffersService],
})
export class OffersModule {}
