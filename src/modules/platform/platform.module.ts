import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      StoreEntity,
      IndependentSellerEntity,
      DeliveryPartnerProfileEntity,
      ParentOrderEntity,
    ]),
  ],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
