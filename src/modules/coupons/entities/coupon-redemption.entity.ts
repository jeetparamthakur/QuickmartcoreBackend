import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CouponEntity } from './coupon.entity';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { ParentOrderEntity } from '../../orders/entities/parent-order.entity';

@Entity('coupon_redemptions')
export class CouponRedemptionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId!: string;

  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Index()
  @Column({ name: 'parent_order_id', type: 'uuid' })
  parentOrderId!: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 12, scale: 2 })
  discountAmount!: string;

  @Column({ name: 'redeemed_at', type: 'timestamptz' })
  redeemedAt!: Date;

  @ManyToOne(() => CouponEntity)
  @JoinColumn({ name: 'coupon_id' })
  coupon!: CouponEntity;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @ManyToOne(() => ParentOrderEntity)
  @JoinColumn({ name: 'parent_order_id' })
  parentOrder!: ParentOrderEntity;
}
