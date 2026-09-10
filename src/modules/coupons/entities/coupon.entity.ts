import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import {
  CouponCreatedByType,
  CouponFundingSource,
  CouponScopeType,
  CouponType,
} from '../../../common/enums';
import { StoreEntity } from '../../stores/entities/store.entity';
import { IndependentSellerEntity } from '../../independent-sellers/entities/independent-seller.entity';

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

  @Column({
    name: 'min_order_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: '0',
  })
  minOrderAmount!: string;

  @Column({
    name: 'max_discount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxDiscount?: string | null;

  @Column({ name: 'usage_limit', type: 'int', nullable: true })
  usageLimit?: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0 })
  usedCount!: number;

  @Column({ name: 'per_customer_limit', type: 'int', default: 1 })
  perCustomerLimit!: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({
    name: 'scope_type',
    type: 'enum',
    enum: CouponScopeType,
    default: CouponScopeType.GLOBAL,
  })
  scopeType!: CouponScopeType;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'independent_seller_id', type: 'uuid', nullable: true })
  independentSellerId?: string | null;

  @Column({
    name: 'funding_source',
    type: 'enum',
    enum: CouponFundingSource,
    default: CouponFundingSource.PLATFORM,
  })
  fundingSource!: CouponFundingSource;

  @Column({
    name: 'created_by_type',
    type: 'enum',
    enum: CouponCreatedByType,
    default: CouponCreatedByType.ADMIN,
  })
  createdByType!: CouponCreatedByType;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string | null;

  @ManyToOne(() => StoreEntity, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store?: StoreEntity | null;

  @ManyToOne(() => IndependentSellerEntity, { nullable: true })
  @JoinColumn({ name: 'independent_seller_id' })
  independentSeller?: IndependentSellerEntity | null;
}
