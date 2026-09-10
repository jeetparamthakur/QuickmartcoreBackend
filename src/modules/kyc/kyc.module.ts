import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { UsersModule } from '../users/users.module';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { KycSubmissionEntity } from './entities/kyc-submission.entity';
import { KycDocumentEntity } from './entities/kyc-document.entity';
import { KycService } from './kyc.service';
import { PartnerProvisioningService } from './partner-provisioning.service';
import { KycController } from './kyc.controller';
import { KycAdminController } from './kyc-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KycSubmissionEntity,
      KycDocumentEntity,
      SellerProfileEntity,
      StoreOwnerProfileEntity,
      StoreEntity,
      IndependentSellerEntity,
      DeliveryPartnerProfileEntity,
      UserEntity,
    ]),
    FileUploadModule,
    UsersModule,
  ],
  controllers: [KycController, KycAdminController],
  providers: [KycService, PartnerProvisioningService],
  exports: [KycService],
})
export class KycModule {}
