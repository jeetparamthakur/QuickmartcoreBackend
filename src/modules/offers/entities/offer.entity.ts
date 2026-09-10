import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OfferStatus } from '../../../common/enums';

@Entity('offers')
export class OfferEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  discountPercent?: string | null;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ type: 'enum', enum: OfferStatus, default: OfferStatus.ACTIVE })
  status!: OfferStatus;

  @Column({
    name: 'linked_coupon_code',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  linkedCouponCode?: string | null;
}
