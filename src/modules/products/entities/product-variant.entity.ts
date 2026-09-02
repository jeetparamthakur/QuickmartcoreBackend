import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MasterProductEntity } from './master-product.entity';

@Entity('product_variants')
export class ProductVariantEntity extends BaseEntity {
  @Index()
  @Column({ name: 'master_product_id', type: 'uuid' })
  masterProductId!: string;

  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  @ManyToOne(() => MasterProductEntity, (p) => p.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'master_product_id' })
  masterProduct!: MasterProductEntity;
}
