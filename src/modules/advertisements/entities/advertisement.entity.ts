import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AdvertisementStatus } from '../../../common/enums';

@Entity('advertisements')
export class AdvertisementEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  content?: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'target_url', type: 'varchar', length: 500, nullable: true })
  targetUrl?: string | null;

  @Column({ type: 'enum', enum: AdvertisementStatus, default: AdvertisementStatus.DRAFT })
  status!: AdvertisementStatus;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;
}
