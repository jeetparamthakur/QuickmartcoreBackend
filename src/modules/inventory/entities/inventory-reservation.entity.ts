import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReservationStatus } from '../../../common/enums';

@Entity('inventory_reservations')
export class InventoryReservationEntity extends BaseEntity {
  @Index()
  @Column({ name: 'parent_order_id', type: 'uuid' })
  parentOrderId!: string;

  @Column({ name: 'seller_product_id', type: 'uuid' })
  sellerProductId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.HELD,
  })
  status!: ReservationStatus;
}
