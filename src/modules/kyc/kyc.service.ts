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
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { KycSubmissionEntity } from './entities/kyc-submission.entity';
import { KycDocumentEntity } from './entities/kyc-document.entity';
import {
  CompleteOnboardingDto,
  ReviewKycDto,
  UpdateOnboardingDto,
} from './dto/kyc.dto';
import { PartnerProvisioningService } from './partner-provisioning.service';
import { randomUUID } from 'crypto';

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
  foodSetup?: object | null;
  bankDetails?: object | null;
  userType: UserType;
  createdAt: string;
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
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly deliveryPartnerProfiles: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly fileUploadService: FileUploadService,
    private readonly partnerProvisioning: PartnerProvisioningService,
  ) {}

  async getOrCreateSubmission(userId: string): Promise<KycSubmissionEntity> {
    let submission = await this.submissions.findOne({
      where: { userId },
      relations: ['documents'],
    });
    if (!submission) {
      submission = this.submissions.create({
        userId,
        status: KycStatus.PENDING,
      });
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
      documents: docs.map((d) => this.mapDocument(d)),
    };
  }

  async listForAdmin(status?: KycStatus) {
    const requests = await this.listRequestsForAdmin({ status });
    return requests.filter((r) => r.requestType === 'KYC_ONBOARDING');
  }

  async listRequestsForAdmin(filters?: {
    status?: KycStatus | ApprovalStatus;
    partnerType?: string;
  }) {
    const kycRequests = await this.buildKycRequestSummaries();
    const deliveryRequests = await this.buildDeliveryPartnerRequestSummaries();
    let combined = [...kycRequests, ...deliveryRequests];

    if (filters?.status) {
      combined = combined.filter((r) => r.status === filters.status);
    }
    if (filters?.partnerType) {
      combined = combined.filter((r) => r.partnerType === filters.partnerType);
    }

    return combined.sort(
      (a, b) =>
        new Date(b.submittedAt ?? b.createdAt).getTime() -
        new Date(a.submittedAt ?? a.createdAt).getTime(),
    );
  }

  async getRequestDetailForAdmin(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.userType === UserType.DELIVERY_PARTNER) {
      const profile = await this.deliveryPartnerProfiles.findOne({
        where: { userId },
      });
      if (!profile)
        throw new NotFoundException('Delivery partner profile not found');
      const kyc = await this.getStatus(userId);
      return {
        userId,
        requestType: 'DELIVERY_PARTNER' as const,
        partnerType: 'DELIVERY_PARTNER',
        name: profile.fullName,
        phone: user.phone ?? undefined,
        email: user.email,
        status: profile.approvalStatus,
        approvalStatus: profile.approvalStatus,
        rejectionReason: profile.rejectionReason ?? undefined,
        reviewedAt: profile.reviewedAt?.toISOString(),
        createdAt: profile.createdAt.toISOString(),
        submittedAt: profile.createdAt.toISOString(),
        preference: profile.preference,
        documents: kyc.documents,
        businessDetails: undefined,
        storeDetails: undefined,
        sellerSetup: undefined,
        bankDetails: undefined,
      };
    }

    const profile = await this.resolvePartnerProfileByUserId(userId);
    const kyc = await this.getStatus(userId);
    return {
      userId,
      requestType: 'KYC_ONBOARDING' as const,
      partnerType: profile.partnerType,
      name: profile.name,
      phone: user.phone ?? undefined,
      email: user.email,
      status: kyc.status,
      approvalStatus: profile.approvalStatus,
      onboardingStep: profile.onboardingStep,
      rejectionReason: kyc.rejectionReason,
      submittedAt: (
        await this.submissions.findOne({ where: { userId } })
      )?.submittedAt?.toISOString(),
      reviewedAt: (
        await this.submissions.findOne({ where: { userId } })
      )?.reviewedAt?.toISOString(),
      createdAt: profile.createdAt,
      documents: kyc.documents,
      businessDetails: profile.businessDetails ?? undefined,
      storeDetails: profile.storeDetails ?? undefined,
      sellerSetup: profile.sellerSetup ?? undefined,
      foodSetup: profile.foodSetup ?? undefined,
      bankDetails: profile.bankDetails ?? undefined,
    };
  }

  async reviewRequest(userId: string, dto: ReviewKycDto) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.userType === UserType.DELIVERY_PARTNER) {
      return this.reviewDeliveryPartner(userId, dto);
    }

    return this.reviewKyc(userId, dto);
  }

  async reviewDeliveryPartner(userId: string, dto: ReviewKycDto) {
    const profile = await this.deliveryPartnerProfiles.findOne({
      where: { userId },
    });
    if (!profile)
      throw new NotFoundException('Delivery partner profile not found');

    if (dto.status === 'approved') {
      profile.approvalStatus = ApprovalStatus.APPROVED;
      profile.rejectionReason = null;
      profile.reviewedAt = new Date();
    } else {
      profile.approvalStatus = ApprovalStatus.REJECTED;
      profile.rejectionReason = dto.rejectionReason ?? 'Application rejected';
      profile.reviewedAt = new Date();
    }

    await this.deliveryPartnerProfiles.save(profile);
    return this.getRequestDetailForAdmin(userId);
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

    const uploaded = await this.fileUploadService.uploadToCloudinary(file, {
      folder: `${this.fileUploadService.getRootFolder()}/kyc/${userId}`,
      publicId: docType,
    });
    const submission = await this.getOrCreateSubmission(userId);

    const existing = await this.documents.findOne({
      where: { submissionId: submission.id, type: docType },
    });

    const now = new Date();
    if (existing) {
      existing.fileUrl = uploaded.url;
      existing.cloudinaryPublicId = uploaded.publicId ?? null;
      existing.uploadedAt = now;
      await this.documents.save(existing);
      return {
        success: true,
        document: this.mapDocument(existing),
      };
    }

    const doc = this.documents.create({
      submissionId: submission.id,
      type: docType,
      fileUrl: uploaded.url,
      cloudinaryPublicId: uploaded.publicId ?? null,
      uploadedAt: now,
    });
    const saved = await this.documents.save(doc);
    return {
      success: true,
      document: this.mapDocument(saved),
    };
  }

  async uploadFoodImage(userId: string, file: Express.Multer.File) {
    this.fileUploadService.validateFile(file);
    const uploaded = await this.fileUploadService.uploadToCloudinary(file, {
      folder: `${this.fileUploadService.getRootFolder()}/food/${userId}`,
      publicId: randomUUID(),
    });
    return { success: true, url: uploaded.url };
  }

  async submitKyc(userId: string) {
    const submission = await this.getOrCreateSubmission(userId);
    const docs = await this.documents.find({
      where: { submissionId: submission.id },
    });
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

  async updateOnboarding(
    userId: string,
    userType: UserType,
    dto: UpdateOnboardingDto,
  ) {
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
      if (
        dto.businessDetails.fullName &&
        typeof dto.businessDetails.fullName === 'string'
      ) {
        updates.name = dto.businessDetails.fullName;
      }
    }
    if (dto.storeDetails) {
      updates.storeDetails = {
        ...(profile.storeDetails ?? {}),
        ...dto.storeDetails,
      };
    }
    if (dto.sellerSetup) {
      updates.sellerSetup = {
        ...(profile.sellerSetup ?? {}),
        ...dto.sellerSetup,
      };
    }
    if (dto.foodSetup) {
      updates.foodSetup = {
        ...(profile.foodSetup ?? {}),
        ...dto.foodSetup,
      };
    }
    if (
      dto.onboardingStep === OnboardingStep.KYC &&
      profile.partnerType === PartnerType.FOOD_STORE
    ) {
      const foodSetup = (updates.foodSetup ?? profile.foodSetup) as
        | Record<string, unknown>
        | null
        | undefined;
      this.validateFoodSetup(foodSetup);
    }
    if (dto.bankDetails) {
      updates.bankDetails = {
        ...(profile.bankDetails ?? {}),
        ...dto.bankDetails,
      };
    }

    await this.savePartnerProfile(userId, userType, updates);

    if (dto.sellerSetup && userType === UserType.SELLER) {
      const seller = await this.sellerProfiles.findOne({ where: { userId } });
      if (seller?.partnerType === PartnerType.INDEPENDENT_SELLER) {
        await this.partnerProvisioning.syncIndependentSellerFromSetup(
          seller.id,
          updates.sellerSetup as Record<string, unknown>,
        );
      }
    }

    return this.buildPartnerResponse(userId, userType);
  }

  async completeOnboarding(
    userId: string,
    userType: UserType,
    dto: CompleteOnboardingDto,
  ) {
    if (dto.bankDetails) {
      await this.updateOnboarding(userId, userType, {
        bankDetails: dto.bankDetails,
      });
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

    await this.partnerProvisioning.provisionForUser(userId, false);

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
      await this.partnerProvisioning.activateForUser(userId);
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

    if (
      profile.onboardingStep === OnboardingStep.PENDING_APPROVAL ||
      profile.onboardingStep === OnboardingStep.COMPLETED
    ) {
      const activate = profile.approvalStatus === ApprovalStatus.APPROVED;
      await this.partnerProvisioning.provisionForUser(userId, activate);
    }

    const refreshed = await this.getPartnerProfileRecord(userId, userType);
    const kyc = await this.getStatus(userId);
    const isStoreOpen =
      refreshed.storeDetails &&
      typeof (refreshed.storeDetails as Record<string, unknown>).isOpen ===
        'boolean'
        ? ((refreshed.storeDetails as Record<string, unknown>)
            .isOpen as boolean)
        : true;

    return {
      id: refreshed.id,
      name: refreshed.name,
      partnerType: refreshed.partnerType,
      onboardingStep: refreshed.onboardingStep,
      approvalStatus: refreshed.approvalStatus,
      isStoreOpen,
      businessDetails: refreshed.businessDetails ?? undefined,
      storeDetails: refreshed.storeDetails ?? undefined,
      sellerSetup: refreshed.sellerSetup ?? undefined,
      foodSetup: refreshed.foodSetup ?? undefined,
      bankDetails: refreshed.bankDetails ?? undefined,
      kyc,
    };
  }

  private validateFoodSetup(foodSetup?: Record<string, unknown> | null) {
    if (!foodSetup) {
      throw new BadRequestException('Food setup is required');
    }

    const name = foodSetup.name;
    if (typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('Restaurant name is required');
    }

    const items = foodSetup.items;
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('Invalid food item');
      }
      const record = item as Record<string, unknown>;
      const itemName = record.name;
      const price = record.price;
      const prepTimeMinutes = record.prepTimeMinutes;

      if (typeof itemName !== 'string' || !itemName.trim()) {
        throw new BadRequestException('Each food item must have a name');
      }
      if (typeof price !== 'number' || price <= 0) {
        throw new BadRequestException(
          'Each food item must have a price greater than 0',
        );
      }
      if (
        typeof prepTimeMinutes !== 'number' ||
        prepTimeMinutes < 0 ||
        !Number.isFinite(prepTimeMinutes)
      ) {
        throw new BadRequestException(
          'Each food item must have a valid prep time',
        );
      }
    }
  }

  private mapDocument(d: KycDocumentEntity) {
    return {
      id: d.id,
      type: d.type,
      uri: d.fileUrl,
      uploadedAt: d.uploadedAt.toISOString(),
    };
  }

  private async buildKycRequestSummaries() {
    const submissions = await this.submissions.find({
      relations: ['documents'],
      order: { updatedAt: 'DESC' },
    });

    const summaries = [];
    for (const submission of submissions) {
      try {
        const profile = await this.resolvePartnerProfileByUserId(
          submission.userId,
        );
        const user = await this.users.findOne({
          where: { id: submission.userId },
        });
        const docs = submission.documents?.length
          ? submission.documents
          : await this.documents.find({
              where: { submissionId: submission.id },
              order: { uploadedAt: 'DESC' },
            });

        summaries.push({
          userId: submission.userId,
          requestType: 'KYC_ONBOARDING',
          partnerType: profile.partnerType,
          name: profile.name,
          phone: user?.phone ?? undefined,
          email: user?.email,
          status: submission.status,
          approvalStatus: profile.approvalStatus,
          onboardingStep: profile.onboardingStep,
          rejectionReason: submission.rejectionReason ?? undefined,
          submittedAt: submission.submittedAt?.toISOString(),
          reviewedAt: submission.reviewedAt?.toISOString(),
          createdAt: profile.createdAt,
          documentCount: docs.length,
        });
      } catch {
        // Skip submissions without a partner profile
      }
    }
    return summaries;
  }

  private async buildDeliveryPartnerRequestSummaries() {
    const profiles = await this.deliveryPartnerProfiles.find({
      order: { createdAt: 'DESC' },
    });

    const summaries = [];
    for (const profile of profiles) {
      const user = await this.users.findOne({ where: { id: profile.userId } });
      const docs = await this.documents.find({
        where: {
          submissionId: (await this.getOrCreateSubmission(profile.userId)).id,
        },
      });

      summaries.push({
        userId: profile.userId,
        requestType: 'DELIVERY_PARTNER',
        partnerType: 'DELIVERY_PARTNER',
        name: profile.fullName,
        phone: user?.phone ?? undefined,
        email: user?.email,
        status: profile.approvalStatus,
        approvalStatus: profile.approvalStatus,
        rejectionReason: profile.rejectionReason ?? undefined,
        submittedAt: profile.createdAt.toISOString(),
        reviewedAt: profile.reviewedAt?.toISOString(),
        createdAt: profile.createdAt.toISOString(),
        documentCount: docs.length,
      });
    }
    return summaries;
  }

  private async resolvePartnerProfileByUserId(
    userId: string,
  ): Promise<PartnerProfileRecord> {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller) {
      return {
        id: seller.id,
        userId: seller.userId,
        name: seller.businessName,
        partnerType: seller.partnerType ?? PartnerType.INDEPENDENT_SELLER,
        onboardingStep: seller.onboardingStep,
        approvalStatus: seller.approvalStatus,
        businessDetails: seller.businessDetails,
        storeDetails: seller.storeDetails,
        sellerSetup: seller.sellerSetup,
        foodSetup: seller.foodSetup,
        bankDetails: seller.bankDetails,
        userType: UserType.SELLER,
        createdAt: seller.createdAt.toISOString(),
      };
    }

    const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
    if (owner) {
      return {
        id: owner.id,
        userId: owner.userId,
        name: owner.fullName,
        partnerType: owner.partnerType ?? PartnerType.STORE,
        onboardingStep: owner.onboardingStep,
        approvalStatus: owner.approvalStatus,
        businessDetails: owner.businessDetails,
        storeDetails: owner.storeDetails,
        foodSetup: owner.foodSetup,
        bankDetails: owner.bankDetails,
        userType: UserType.STORE_OWNER,
        createdAt: owner.createdAt.toISOString(),
      };
    }

    throw new NotFoundException('Partner profile not found');
  }

  private async getPartnerProfileRecord(
    userId: string,
    userType: UserType,
  ): Promise<PartnerProfileRecord> {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      if (!profile)
        throw new NotFoundException('Store owner profile not found');
      return {
        id: profile.id,
        userId: profile.userId,
        name: profile.fullName,
        partnerType: profile.partnerType ?? PartnerType.STORE,
        onboardingStep: profile.onboardingStep,
        approvalStatus: profile.approvalStatus,
        businessDetails: profile.businessDetails,
        storeDetails: profile.storeDetails,
        foodSetup: profile.foodSetup,
        bankDetails: profile.bankDetails,
        userType,
        createdAt: profile.createdAt.toISOString(),
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
      storeDetails: profile.storeDetails,
      sellerSetup: profile.sellerSetup,
      foodSetup: profile.foodSetup,
      bankDetails: profile.bankDetails,
      userType,
      createdAt: profile.createdAt.toISOString(),
    };
  }

  private async savePartnerProfile(
    userId: string,
    userType: UserType,
    updates: Partial<PartnerProfileRecord>,
  ) {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      if (!profile)
        throw new NotFoundException('Store owner profile not found');
      if (updates.name) profile.fullName = updates.name;
      if (updates.onboardingStep)
        profile.onboardingStep = updates.onboardingStep;
      if (updates.approvalStatus)
        profile.approvalStatus = updates.approvalStatus;
      if (updates.partnerType) profile.partnerType = updates.partnerType;
      if (updates.businessDetails !== undefined)
        profile.businessDetails = updates.businessDetails;
      if (updates.storeDetails !== undefined)
        profile.storeDetails = updates.storeDetails;
      if (updates.foodSetup !== undefined)
        profile.foodSetup = updates.foodSetup;
      if (updates.bankDetails !== undefined)
        profile.bankDetails = updates.bankDetails;
      await this.storeOwnerProfiles.save(profile);
      return;
    }

    const profile = await this.sellerProfiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    if (updates.name) profile.businessName = updates.name;
    if (updates.onboardingStep) profile.onboardingStep = updates.onboardingStep;
    if (updates.approvalStatus) profile.approvalStatus = updates.approvalStatus;
    if (updates.partnerType) profile.partnerType = updates.partnerType;
    if (updates.businessDetails !== undefined)
      profile.businessDetails = updates.businessDetails;
    if (updates.storeDetails !== undefined)
      profile.storeDetails = updates.storeDetails;
    if (updates.sellerSetup !== undefined)
      profile.sellerSetup = updates.sellerSetup;
    if (updates.foodSetup !== undefined)
      profile.foodSetup = updates.foodSetup;
    if (updates.bankDetails !== undefined)
      profile.bankDetails = updates.bankDetails;
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
