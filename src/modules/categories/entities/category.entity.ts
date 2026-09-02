import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { MasterProductEntity } from '../../products/entities/master-product.entity';

@Entity('categories')
export class CategoryEntity extends SoftDeleteEntity {
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @ManyToOne(() => CategoryEntity, (c) => c.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (c) => c.parent)
  children?: CategoryEntity[];

  @OneToMany(() => MasterProductEntity, (p) => p.category)
  products?: MasterProductEntity[];
}
