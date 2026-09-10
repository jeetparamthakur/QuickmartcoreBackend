import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ParentOrderStatus, PaymentStatus } from '../../../common/enums';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { SubOrderEntity } from './sub-order.entity';

@Entity('parent_orders')
export class ParentOrderEntity extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({
    type: 'enum',
    enum: ParentOrderStatus,
    default: ParentOrderStatus.PLACED,
  })
  status!: ParentOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: string;

  @Column({
    name: 'discount_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountTotal!: string;

  @Column({ name: 'coupon_id', type: 'uuid', nullable: true })
  couponId?: string | null;

  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode?: string | null;

  @Column({
    name: 'delivery_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  deliveryFee!: string;

  @Column({
    name: 'tax_total',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  taxTotal!: string;

  @Column({
    name: 'platform_fee',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  platformFee!: string;

  @Column({ name: 'charge_breakdown', type: 'jsonb', default: [] })
  chargeBreakdown!: Array<{
    code: string;
    name: string;
    type: string;
    amount: number;
  }>;

  @Column({
    name: 'total_payable',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalPayable!: string;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @OneToMany(() => SubOrderEntity, (so) => so.parentOrder)
  subOrders?: SubOrderEntity[];
}
