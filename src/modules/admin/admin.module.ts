import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AdminActivityEntity,
  AdminPermissionsEntity,
  AdminProfileEntity,
  RestrictionAuditLogEntity,
} from './entities/admin-profile.entity';
import { SuperAdminController } from './super-admin.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminCrudController } from './admin-crud.controller';
import { AdminControlService } from './admin-control.service';
import { AdminEventsService } from './admin-events.service';
import { AdminCrudService } from './admin-crud.service';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { CustomerProfileEntity } from '../customers/entities/customer-profile.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { AccessControlModule } from '../access-control/access-control.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminProfileEntity,
      AdminPermissionsEntity,
      AdminActivityEntity,
      RestrictionAuditLogEntity,
      UserEntity,
      StoreEntity,
      CustomerProfileEntity,
      ParentOrderEntity,
      DeliveryPartnerProfileEntity,
      IndependentSellerEntity,
    ]),
    AuthModule,
    AccessControlModule,
  ],
  controllers: [SuperAdminController, AdminEventsController, AdminCrudController],
  providers: [AdminControlService, AdminEventsService, AdminCrudService],
  exports: [AdminControlService, AdminEventsService, AdminCrudService],
})
export class AdminModule {}
