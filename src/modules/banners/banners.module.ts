import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerEntity } from './entities/banner.entity';
import { BannersService, BannersRepository } from './banners.service';
import { BannersAdminController, BannersController } from './banners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BannerEntity])],
  controllers: [BannersAdminController, BannersController],
  providers: [BannersService, BannersRepository],
  exports: [BannersService],
})
export class BannersModule {}
