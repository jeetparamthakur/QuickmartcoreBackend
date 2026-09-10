import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  ApprovalStatus,
  DeliveryPartnerPreference,
} from '../../../common/enums';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('delivery_partner_profiles')
export class DeliveryPartnerProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({
    type: 'enum',
    enum: DeliveryPartnerPreference,
    default: DeliveryPartnerPreference.BOTH,
  })
  preference!: DeliveryPartnerPreference;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.APPROVED,
  })
  approvalStatus!: ApprovalStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'is_online', type: 'boolean', default: false })
  isOnline!: boolean;

  @Column({
    name: 'current_lat',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLat?: string | null;

  @Column({
    name: 'current_lng',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  currentLng?: string | null;

  @OneToOne(() => UserEntity, (u) => u.deliveryPartnerProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
