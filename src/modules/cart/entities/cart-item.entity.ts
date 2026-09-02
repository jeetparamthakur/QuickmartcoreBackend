import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CartEntity } from './cart.entity';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('cart_items')
export class CartItemEntity extends BaseEntity {
  @Index()
  @Column({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  @Column({ name: 'seller_product_id', type: 'uuid' })
  sellerProductId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    name: 'unit_price_snapshot',
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  unitPriceSnapshot!: string;

  @ManyToOne(() => CartEntity, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: CartEntity;

  @ManyToOne(() => SellerProductEntity)
  @JoinColumn({ name: 'seller_product_id' })
  sellerProduct!: SellerProductEntity;
}
