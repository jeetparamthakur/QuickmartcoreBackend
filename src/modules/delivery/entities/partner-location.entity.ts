import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';

@Entity('partner_locations')
export class PartnerLocationEntity extends BaseEntity {
  @Index()
  @Column({ name: 'partner_profile_id', type: 'uuid' })
  partnerProfileId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng!: string;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt!: Date;

  @ManyToOne(() => DeliveryPartnerProfileEntity)
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile!: DeliveryPartnerProfileEntity;
}
