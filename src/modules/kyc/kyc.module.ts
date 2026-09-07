import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { KycSubmissionEntity } from './entities/kyc-submission.entity';
import { KycDocumentEntity } from './entities/kyc-document.entity';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { KycAdminController } from './kyc-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      KycSubmissionEntity,
      KycDocumentEntity,
      SellerProfileEntity,
      StoreOwnerProfileEntity,
    ]),
    FileUploadModule,
  ],
  controllers: [KycController, KycAdminController],
  providers: [KycService],
  exports: [KycService],
})
export class KycModule {}
