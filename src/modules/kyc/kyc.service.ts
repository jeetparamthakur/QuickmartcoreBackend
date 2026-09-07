import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApprovalStatus,
  KycDocumentType,
  KycStatus,
  OnboardingStep,
  PartnerType,
  UserType,
} from '../../common/enums';
import { FileUploadService } from '../file-upload/file-upload.service';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { KycSubmissionEntity } from './entities/kyc-submission.entity';
import { KycDocumentEntity } from './entities/kyc-document.entity';
import {
  CompleteOnboardingDto,
  ReviewKycDto,
  UpdateOnboardingDto,
} from './dto/kyc.dto';

const REQUIRED_DOC_TYPES = [
  KycDocumentType.PAN,
  KycDocumentType.BUSINESS,
  KycDocumentType.ADDRESS_PROOF,
];

type PartnerProfileRecord = {
  id: string;
  userId: string;
  name: string;
  partnerType: PartnerType;
  onboardingStep: OnboardingStep;
  approvalStatus: ApprovalStatus;
  businessDetails?: object | null;
  storeDetails?: object | null;
  sellerSetup?: object | null;
  bankDetails?: object | null;
  userType: UserType;
};

@Injectable()
export class KycService {
  constructor(
    @InjectRepository(KycSubmissionEntity)
    private readonly submissions: Repository<KycSubmissionEntity>,
    @InjectRepository(KycDocumentEntity)
    private readonly documents: Repository<KycDocumentEntity>,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async getOrCreateSubmission(userId: string): Promise<KycSubmissionEntity> {
    let submission = await this.submissions.findOne({
      where: { userId },
      relations: ['documents'],
    });
    if (!submission) {
      submission = this.submissions.create({ userId, status: KycStatus.PENDING });
      submission = await this.submissions.save(submission);
      submission.documents = [];
    }
    return submission;
  }

  async getStatus(userId: string) {
    const submission = await this.getOrCreateSubmission(userId);
    const docs = await this.documents.find({
      where: { submissionId: submission.id },
      order: { uploadedAt: 'DESC' },
    });
    return {
      status: submission.status,
      rejectionReason: submission.rejectionReason ?? undefined,
      documents: docs.map((d) => ({
        id: d.id,
        type: d.type,
        uri: d.fileUrl,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
    };
  }

  async uploadDocument(
    userId: string,
    type: string,
    file: Express.Multer.File,
  ) {
    const docType = type as KycDocumentType;
    if (!Object.values(KycDocumentType).includes(docType)) {
      throw new BadRequestException('Invalid document type');
    }

    const uploaded = await this.fileUploadService.saveLocal(file);
    const submission = await this.getOrCreateSubmission(userId);

    const existing = await this.documents.findOne({
      where: { submissionId: submission.id, type: docType },
    });

    const now = new Date();
    if (existing) {
      existing.fileUrl = uploaded.url;
      existing.uploadedAt = now;
      await this.documents.save(existing);
      return {
        success: true,
        document: {
          id: existing.id,
          type: existing.type,
          uri: existing.fileUrl,
          uploadedAt: existing.uploadedAt.toISOString(),
        },
      };
    }

    const doc = this.documents.create({
      submissionId: submission.id,
      type: docType,
      fileUrl: uploaded.url,
      uploadedAt: now,
    });
    const saved = await this.documents.save(doc);
    return {
      success: true,
      document: {
        id: saved.id,
        type: saved.type,
        uri: saved.fileUrl,
        uploadedAt: saved.uploadedAt.toISOString(),
      },
    };
  }

  async submitKyc(userId: string) {
    const submission = await this.getOrCreateSubmission(userId);
    const docs = await this.documents.find({ where: { submissionId: submission.id } });
    const uploadedTypes = new Set(docs.map((d) => d.type));

    for (const required of REQUIRED_DOC_TYPES) {
      if (!uploadedTypes.has(required)) {
        throw new BadRequestException(`Missing required document: ${required}`);
      }
    }

    submission.status = KycStatus.UNDER_REVIEW;
    submission.submittedAt = new Date();
    submission.rejectionReason = null;
    await this.submissions.save(submission);

    await this.updatePartnerProfile(userId, {
      onboardingStep: OnboardingStep.BANK_SETUP,
    });

    return { success: true, status: submission.status };
  }

  async updateOnboarding(userId: string, userType: UserType, dto: UpdateOnboardingDto) {
    const profile = await this.getPartnerProfileRecord(userId, userType);
    const updates: Partial<PartnerProfileRecord> = {};

    if (dto.onboardingStep) updates.onboardingStep = dto.onboardingStep;
    if (dto.partnerType) updates.partnerType = dto.partnerType;
    if (dto.businessDetails) {
      const merged = {
        ...((profile.businessDetails as Record<string, unknown>) ?? {}),
        ...dto.businessDetails,
      };
      updates.businessDetails = merged;
      if (dto.businessDetails.fullName && typeof dto.businessDetails.fullName === 'string') {
        updates.name = dto.businessDetails.fullName;
      }
    }
    if (dto.storeDetails) {
      updates.storeDetails = {
        ...((profile.storeDetails as Record<string, unknown>) ?? {}),
        ...dto.storeDetails,
      };
    }
    if (dto.sellerSetup) {
      updates.sellerSetup = {
        ...((profile.sellerSetup as Record<string, unknown>) ?? {}),
        ...dto.sellerSetup,
      };
    }
    if (dto.bankDetails) {
      updates.bankDetails = {
        ...((profile.bankDetails as Record<string, unknown>) ?? {}),
        ...dto.bankDetails,
      };
    }

    await this.savePartnerProfile(userId, userType, updates);
    return this.buildPartnerResponse(userId, userType);
  }

  async completeOnboarding(userId: string, userType: UserType, dto: CompleteOnboardingDto) {
    if (dto.bankDetails) {
      await this.updateOnboarding(userId, userType, { bankDetails: dto.bankDetails });
    }

    await this.updatePartnerProfile(userId, {
      onboardingStep: OnboardingStep.PENDING_APPROVAL,
      approvalStatus: ApprovalStatus.UNDER_REVIEW,
    });

    const submission = await this.submissions.findOne({ where: { userId } });
    if (submission && submission.status === KycStatus.PENDING) {
      submission.status = KycStatus.UNDER_REVIEW;
      submission.submittedAt = new Date();
      await this.submissions.save(submission);
    }

    return this.buildPartnerResponse(userId, userType);
  }

  async reviewKyc(userId: string, dto: ReviewKycDto) {
    const submission = await this.submissions.findOne({ where: { userId } });
    if (!submission) throw new NotFoundException('KYC submission not found');

    if (dto.status === 'approved') {
      submission.status = KycStatus.APPROVED;
      submission.reviewedAt = new Date();
      submission.rejectionReason = null;
      await this.submissions.save(submission);

      await this.updatePartnerProfileByUserId(userId, {
        approvalStatus: ApprovalStatus.APPROVED,
        onboardingStep: OnboardingStep.COMPLETED,
      });
    } else {
      submission.status = KycStatus.REJECTED;
      submission.reviewedAt = new Date();
      submission.rejectionReason = dto.rejectionReason ?? 'Documents rejected';
      await this.submissions.save(submission);

      await this.updatePartnerProfileByUserId(userId, {
        approvalStatus: ApprovalStatus.REJECTED,
        onboardingStep: OnboardingStep.KYC,
      });
    }

    return this.getStatus(userId);
  }

  async buildPartnerResponse(userId: string, userType: UserType) {
    const profile = await this.getPartnerProfileRecord(userId, userType);
    const kyc = await this.getStatus(userId);
    const isStoreOpen =
      profile.storeDetails &&
      typeof (profile.storeDetails as Record<string, unknown>).isOpen === 'boolean'
        ? (profile.storeDetails as Record<string, unknown>).isOpen as boolean
        : true;

    return {
      id: profile.id,
      name: profile.name,
      partnerType: profile.partnerType,
      onboardingStep: profile.onboardingStep,
      approvalStatus: profile.approvalStatus,
      isStoreOpen,
      businessDetails: profile.businessDetails ?? undefined,
      storeDetails: profile.storeDetails ?? undefined,
      sellerSetup: profile.sellerSetup ?? undefined,
      bankDetails: profile.bankDetails ?? undefined,
      kyc,
    };
  }

  private async getPartnerProfileRecord(
    userId: string,
    userType: UserType,
  ): Promise<PartnerProfileRecord> {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!profile) throw new NotFoundException('Store owner profile not found');
      return {
        id: profile.id,
        userId: profile.userId,
        name: profile.fullName,
        partnerType: profile.partnerType ?? PartnerType.STORE,
        onboardingStep: profile.onboardingStep,
        approvalStatus: profile.approvalStatus,
        businessDetails: profile.businessDetails,
        storeDetails: profile.storeDetails,
        bankDetails: profile.bankDetails,
        userType,
      };
    }

    const profile = await this.sellerProfiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.businessName,
      partnerType: profile.partnerType ?? PartnerType.INDEPENDENT_SELLER,
      onboardingStep: profile.onboardingStep,
      approvalStatus: profile.approvalStatus,
      businessDetails: profile.businessDetails,
      sellerSetup: profile.sellerSetup,
      bankDetails: profile.bankDetails,
      userType,
    };
  }

  private async savePartnerProfile(
    userId: string,
    userType: UserType,
    updates: Partial<PartnerProfileRecord>,
  ) {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!profile) throw new NotFoundException('Store owner profile not found');
      if (updates.name) profile.fullName = updates.name;
      if (updates.onboardingStep) profile.onboardingStep = updates.onboardingStep;
      if (updates.approvalStatus) profile.approvalStatus = updates.approvalStatus;
      if (updates.partnerType) profile.partnerType = updates.partnerType;
      if (updates.businessDetails !== undefined) profile.businessDetails = updates.businessDetails;
      if (updates.storeDetails !== undefined) profile.storeDetails = updates.storeDetails;
      if (updates.bankDetails !== undefined) profile.bankDetails = updates.bankDetails;
      await this.storeOwnerProfiles.save(profile);
      return;
    }

    const profile = await this.sellerProfiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    if (updates.name) profile.businessName = updates.name;
    if (updates.onboardingStep) profile.onboardingStep = updates.onboardingStep;
    if (updates.approvalStatus) profile.approvalStatus = updates.approvalStatus;
    if (updates.partnerType) profile.partnerType = updates.partnerType;
    if (updates.businessDetails !== undefined) profile.businessDetails = updates.businessDetails;
    if (updates.sellerSetup !== undefined) profile.sellerSetup = updates.sellerSetup;
    if (updates.bankDetails !== undefined) profile.bankDetails = updates.bankDetails;
    await this.sellerProfiles.save(profile);
  }

  private async updatePartnerProfile(
    userId: string,
    updates: Partial<PartnerProfileRecord>,
  ) {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller) {
      await this.savePartnerProfile(userId, UserType.SELLER, updates);
      return;
    }
    const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
    if (owner) {
      await this.savePartnerProfile(userId, UserType.STORE_OWNER, updates);
      return;
    }
    throw new NotFoundException('Partner profile not found');
  }

  private async updatePartnerProfileByUserId(
    userId: string,
    updates: Partial<PartnerProfileRecord>,
  ) {
    return this.updatePartnerProfile(userId, updates);
  }
}
