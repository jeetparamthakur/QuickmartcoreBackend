import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SellerType, SubOrderStatus } from '../../../common/enums';
import { ParentOrderEntity } from './parent-order.entity';
import { StoreEntity } from '../../stores/entities/store.entity';
import { IndependentSellerEntity } from '../../independent-sellers/entities/independent-seller.entity';
import { OrderItemEntity } from './order-item.entity';
import { OrderStatusHistoryEntity } from './order-status-history.entity';

@Entity('sub_orders')
export class SubOrderEntity extends BaseEntity {
  @Index()
  @Column({ name: 'parent_order_id', type: 'uuid' })
  parentOrderId!: string;

  @Column({ name: 'seller_type', type: 'enum', enum: SellerType })
  sellerType!: SellerType;

  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'independent_seller_id', type: 'uuid', nullable: true })
  independentSellerId?: string | null;

  @Index({ unique: true })
  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ type: 'enum', enum: SubOrderStatus, default: SubOrderStatus.PLACED })
  status!: SubOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal!: string;

  @Column({ name: 'delivery_fee', type: 'decimal', precision: 12, scale: 2, default: 0 })
  deliveryFee!: string;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount!: string;

  @ManyToOne(() => ParentOrderEntity, (po) => po.subOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_order_id' })
  parentOrder!: ParentOrderEntity;

  @ManyToOne(() => StoreEntity, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store?: StoreEntity | null;

  @ManyToOne(() => IndependentSellerEntity, { nullable: true })
  @JoinColumn({ name: 'independent_seller_id' })
  independentSeller?: IndependentSellerEntity | null;

  @OneToMany(() => OrderItemEntity, (oi) => oi.subOrder)
  items?: OrderItemEntity[];

  @OneToMany(() => OrderStatusHistoryEntity, (h) => h.subOrder)
  statusHistory?: OrderStatusHistoryEntity[];
}
