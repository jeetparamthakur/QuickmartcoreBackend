import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertisementEntity } from './entities/advertisement.entity';
import {
  AdvertisementsService,
  AdvertisementsRepository,
} from './advertisements.service';
import { AdvertisementsAdminController } from './advertisements-admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdvertisementEntity])],
  controllers: [AdvertisementsAdminController],
  providers: [AdvertisementsService, AdvertisementsRepository],
  exports: [AdvertisementsService],
})
export class AdvertisementsModule {}
