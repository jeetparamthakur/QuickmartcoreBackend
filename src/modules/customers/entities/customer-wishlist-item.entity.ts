import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerProfileEntity } from './customer-profile.entity';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('customer_wishlist_items')
@Unique(['customerId', 'sellerProductId'])
export class CustomerWishlistItemEntity extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Index()
  @Column({ name: 'seller_product_id', type: 'uuid' })
  sellerProductId!: string;

  @ManyToOne(() => CustomerProfileEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @ManyToOne(() => SellerProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_product_id' })
  sellerProduct!: SellerProductEntity;
}
