import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DeliveryAssignmentStatus } from '../../../common/enums';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../../orders/entities/sub-order.entity';

@Entity('delivery_assignments')
export class DeliveryAssignmentEntity extends BaseEntity {
  @Index()
  @Column({ name: 'sub_order_id', type: 'uuid' })
  subOrderId!: string;

  @Index()
  @Column({ name: 'partner_profile_id', type: 'uuid' })
  partnerProfileId!: string;

  @Column({
    type: 'enum',
    enum: DeliveryAssignmentStatus,
    default: DeliveryAssignmentStatus.PENDING,
  })
  status!: DeliveryAssignmentStatus;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt?: Date | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date | null;

  @Column({ name: 'timeout_at', type: 'timestamptz', nullable: true })
  timeoutAt?: Date | null;

  @ManyToOne(() => SubOrderEntity)
  @JoinColumn({ name: 'sub_order_id' })
  subOrder!: SubOrderEntity;

  @ManyToOne(() => DeliveryPartnerProfileEntity)
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: DeliveryPartnerProfileEntity;
}
