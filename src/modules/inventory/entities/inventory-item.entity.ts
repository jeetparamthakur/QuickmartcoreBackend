import { Column, Entity, Index, JoinColumn, OneToOne, VersionColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { InventoryStatus } from '../../../common/enums';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('inventory_items')
export class InventoryItemEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'seller_product_id', type: 'uuid' })
  sellerProductId!: string;

  @Column({ name: 'quantity_available', type: 'int', default: 0 })
  quantityAvailable!: number;

  @Column({ name: 'quantity_reserved', type: 'int', default: 0 })
  quantityReserved!: number;

  @Column({
    type: 'enum',
    enum: InventoryStatus,
    default: InventoryStatus.AVAILABLE,
  })
  status!: InventoryStatus;

  @VersionColumn()
  version!: number;

  @OneToOne(() => SellerProductEntity, (sp) => sp.inventory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seller_product_id' })
  sellerProduct!: SellerProductEntity;
}
