import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  ApprovalStatus,
  OnboardingStep,
  PartnerType,
} from '../../../common/enums';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('store_owner_profiles')
export class StoreOwnerProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({
    name: 'onboarding_step',
    type: 'varchar',
    length: 32,
    default: OnboardingStep.PARTNER_TYPE,
  })
  onboardingStep!: OnboardingStep;

  @Column({
    name: 'approval_status',
    type: 'varchar',
    length: 32,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus!: ApprovalStatus;

  @Column({
    name: 'partner_type',
    type: 'varchar',
    length: 32,
    default: PartnerType.STORE,
  })
  partnerType!: PartnerType;

  @Column({ name: 'business_details', type: 'jsonb', nullable: true })
  businessDetails?: object | null;

  @Column({ name: 'store_details', type: 'jsonb', nullable: true })
  storeDetails?: object | null;

  @Column({ name: 'food_setup', type: 'jsonb', nullable: true })
  foodSetup?: object | null;

  @Column({ name: 'bank_details', type: 'jsonb', nullable: true })
  bankDetails?: object | null;

  @OneToOne(() => UserEntity, (u) => u.storeOwnerProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
