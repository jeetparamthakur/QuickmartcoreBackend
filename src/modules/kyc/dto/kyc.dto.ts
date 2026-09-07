import { IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { OnboardingStep, PartnerType } from '../../../common/enums';

export class UpdateOnboardingDto {
  @IsOptional()
  @IsEnum(OnboardingStep)
  onboardingStep?: OnboardingStep;

  @IsOptional()
  @IsEnum(PartnerType)
  partnerType?: PartnerType;

  @IsOptional()
  @IsObject()
  businessDetails?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  storeDetails?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sellerSetup?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, unknown>;
}

export class CompleteOnboardingDto {
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, unknown>;
}

export class ReviewKycDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
