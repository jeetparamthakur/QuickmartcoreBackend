import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SubOrderEntity } from './sub-order.entity';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('order_items')
export class OrderItemEntity extends BaseEntity {
  @Index()
  @Column({ name: 'sub_order_id', type: 'uuid' })
  subOrderId!: string;

  @Column({ name: 'seller_product_id', type: 'uuid' })
  sellerProductId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 12, scale: 2 })
  lineTotal!: string;

  @ManyToOne(() => SubOrderEntity, (so) => so.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sub_order_id' })
  subOrder!: SubOrderEntity;

  @ManyToOne(() => SellerProductEntity)
  @JoinColumn({ name: 'seller_product_id' })
  sellerProduct!: SellerProductEntity;
}
