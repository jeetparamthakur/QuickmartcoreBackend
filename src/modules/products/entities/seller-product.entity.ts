import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { SellerType } from '../../../common/enums';
import { MasterProductEntity } from './master-product.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { StoreEntity } from '../../stores/entities/store.entity';
import { IndependentSellerEntity } from '../../independent-sellers/entities/independent-seller.entity';
import { InventoryItemEntity } from '../../inventory/entities/inventory-item.entity';

@Entity('seller_products')
export class SellerProductEntity extends SoftDeleteEntity {
  @Column({ name: 'seller_type', type: 'enum', enum: SellerType })
  sellerType!: SellerType;

  @Index()
  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Index()
  @Column({ name: 'independent_seller_id', type: 'uuid', nullable: true })
  independentSellerId?: string | null;

  @Index()
  @Column({ name: 'master_product_id', type: 'uuid' })
  masterProductId!: string;

  @Column({ name: 'variant_id', type: 'uuid', nullable: true })
  variantId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  mrp!: string;

  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2 })
  sellingPrice!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => MasterProductEntity, (p) => p.sellerProducts)
  @JoinColumn({ name: 'master_product_id' })
  masterProduct!: MasterProductEntity;

  @ManyToOne(() => ProductVariantEntity, { nullable: true })
  @JoinColumn({ name: 'variant_id' })
  variant?: ProductVariantEntity | null;

  @ManyToOne(() => StoreEntity, (s) => s.sellerProducts, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store?: StoreEntity | null;

  @ManyToOne(() => IndependentSellerEntity, (s) => s.sellerProducts, {
    nullable: true,
  })
  @JoinColumn({ name: 'independent_seller_id' })
  independentSeller?: IndependentSellerEntity | null;

  @OneToOne(() => InventoryItemEntity, (i) => i.sellerProduct)
  inventory?: InventoryItemEntity;
}
