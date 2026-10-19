import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPartnerPaySlabEntity } from './entities/delivery-partner-pay-slab.entity';
import { DeliveryPartnerPayEngineService } from './delivery-partner-pay-engine.service';
import { DeliveryPartnerPayService } from './delivery-partner-pay.service';
import { DeliveryPartnerPayAdminController } from './delivery-partner-pay-admin.controller';
import { PartnerAssignmentPayService } from './partner-assignment-pay.service';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryPartnerPaySlabEntity, SubOrderEntity]),
  ],
  controllers: [DeliveryPartnerPayAdminController],
  providers: [
    DeliveryPartnerPayEngineService,
    DeliveryPartnerPayService,
    PartnerAssignmentPayService,
  ],
  exports: [
    DeliveryPartnerPayEngineService,
    DeliveryPartnerPayService,
    PartnerAssignmentPayService,
  ],
})
export class DeliveryPartnerPayModule {}
