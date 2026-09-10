import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CommissionRuleType, SellerType } from '../../../common/enums';

@Entity('commission_rules')
export class CommissionRuleEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: CommissionRuleType })
  type!: CommissionRuleType;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  value!: string;

  @Column({
    name: 'seller_type',
    type: 'enum',
    enum: SellerType,
    nullable: true,
  })
  sellerType?: SellerType | null;

  @Index()
  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId?: string | null;

  @Column({
    name: 'effective_from',
    type: 'date',
    default: () => 'CURRENT_DATE',
  })
  effectiveFrom!: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo?: string | null;

  @Column({ type: 'jsonb', default: {} })
  conditions!: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
