import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { PartnerLocationEntity } from './entities/partner-location.entity';
import { PartnerShiftEntity } from './entities/partner-shift.entity';
import { PartnerShiftService } from './partner-shift.service';
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
import { DeliveryPartnerAppService } from './delivery-partner-app.service';
import { OrdersModule } from '../orders/orders.module';
import { KycModule } from '../kyc/kyc.module';
import { UserEntity } from '../users/entities/user.entity';
import { CustomerAddressEntity } from '../customers/entities/customer-address.entity';
import { KycSubmissionEntity } from '../kyc/entities/kyc-submission.entity';
import { StoresModule } from '../stores/stores.module';
import { IndependentSellersModule } from '../independent-sellers/independent-sellers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeliveryPartnerPushService } from './delivery-partner-push.service';
import { DeliveryPickupPushListener } from './delivery-pickup-push.listener';
import { SellerOrderDeliveryService } from './seller-order-delivery.service';
import { DeliveryPartnerPayModule } from '../delivery-partner-pay/delivery-partner-pay.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeliveryAssignmentEntity,
      PartnerLocationEntity,
      PartnerShiftEntity,
      DeliveryPartnerProfileEntity,
      SubOrderEntity,
      UserEntity,
      CustomerAddressEntity,
      KycSubmissionEntity,
    ]),
    OrdersModule,
    KycModule,
    StoresModule,
    IndependentSellersModule,
    NotificationsModule,
    DeliveryPartnerPayModule,
  ],
  controllers: [DeliveryPartnerController],
  providers: [
    DeliveryAssignmentRepository,
    DeliveryAssignmentService,
    DeliveryTrackingRepository,
    DeliveryTrackingService,
    PartnerShiftService,
    DeliveryPartnerProfileService,
    DeliveryPartnerAppService,
    DeliveryPartnerPushService,
    DeliveryPickupPushListener,
    SellerOrderDeliveryService,
  ],
  exports: [
    DeliveryAssignmentService,
    DeliveryTrackingService,
    DeliveryPartnerPushService,
    SellerOrderDeliveryService,
  ],
})
export class DeliveryModule {}
