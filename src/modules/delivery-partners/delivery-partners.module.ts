import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerProfileEntity } from './entities/delivery-partner-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryPartnerProfileEntity])],
})
export class DeliveryPartnersModule {}
