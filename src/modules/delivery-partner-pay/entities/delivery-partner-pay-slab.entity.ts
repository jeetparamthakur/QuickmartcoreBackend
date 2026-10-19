import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';

@Entity('delivery_partner_pay_slabs')
export class DeliveryPartnerPaySlabEntity extends BaseEntity {
  @Index()
  @Column({ name: 'partner_profile_id', type: 'uuid', nullable: true })
  partnerProfileId?: string | null;

  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId?: string | null;

  @Column({ name: 'min_km', type: 'decimal', precision: 8, scale: 2 })
  minKm!: string;

  @Column({ name: 'max_km', type: 'decimal', precision: 8, scale: 2 })
  maxKm!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  fee!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => DeliveryPartnerProfileEntity, { nullable: true })
  @JoinColumn({ name: 'partner_profile_id' })
  partnerProfile?: DeliveryPartnerProfileEntity | null;
}
