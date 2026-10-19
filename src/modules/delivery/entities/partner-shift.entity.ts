import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';

@Entity('partner_shifts')
export class PartnerShiftEntity extends BaseEntity {
  @Index()
  @Column({ name: 'partner_profile_id', type: 'uuid' })
  partnerProfileId!: string;

  @Index()
  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ name: 'deliveries_completed', type: 'int', default: 0 })
  deliveriesCompleted!: number;

  @Column({
    name: 'earnings',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  earnings!: string;

  @ManyToOne(() => DeliveryPartnerProfileEntity)
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: DeliveryPartnerProfileEntity;
}
