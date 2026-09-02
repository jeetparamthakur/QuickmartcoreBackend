import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { ProductVariantEntity } from './product-variant.entity';
import { SellerProductEntity } from './seller-product.entity';

@Entity('master_products')
export class MasterProductEntity extends SoftDeleteEntity {
  @Index()
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  brand?: string | null;

  @Column({ name: 'base_unit', type: 'varchar', length: 50, default: 'unit' })
  baseUnit!: string;

  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  @ManyToOne(() => CategoryEntity, (c) => c.products)
  @JoinColumn({ name: 'category_id' })
  category!: CategoryEntity;

  @OneToMany(() => ProductVariantEntity, (v) => v.masterProduct)
  variants?: ProductVariantEntity[];

  @OneToMany(() => SellerProductEntity, (sp) => sp.masterProduct)
  sellerProducts?: SellerProductEntity[];
}
