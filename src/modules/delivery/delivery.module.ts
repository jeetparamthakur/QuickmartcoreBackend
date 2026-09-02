import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { PartnerLocationEntity } from './entities/partner-location.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import {
  DeliveryAssignmentRepository,
  DeliveryAssignmentService,
} from './delivery-assignment.service';
import {
  DeliveryTrackingRepository,
  DeliveryTrackingService,
} from './delivery-tracking.service';
import { DeliveryPartnerController } from './delivery-partner.controller';
import { DeliveryPartnerProfileService } from './delivery-partner-profile.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryAssignmentEntity,
      PartnerLocationEntity,
      DeliveryPartnerProfileEntity,
      SubOrderEntity,
    ]),
    OrdersModule,
  ],
  controllers: [DeliveryPartnerController],
  providers: [
    DeliveryAssignmentRepository,
    DeliveryAssignmentService,
    DeliveryTrackingRepository,
    DeliveryTrackingService,
    DeliveryPartnerProfileService,
  ],
  exports: [DeliveryAssignmentService, DeliveryTrackingService],
})
export class DeliveryModule {}
