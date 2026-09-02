import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CouponType } from '../../../common/enums';

@Entity('coupons')
export class CouponEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: CouponType })
  type!: CouponType;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  value!: string;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 12, scale: 2, default: '0' })
  minOrderAmount!: string;

  @Column({ name: 'max_discount', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxDiscount?: string | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit?: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
