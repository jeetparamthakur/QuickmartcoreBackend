import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ChargeType } from '../../../common/enums';

@Entity('charge_rules')
export class ChargeRuleEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'enum', enum: ChargeType })
  type!: ChargeType;

  @Column({ type: 'decimal', precision: 12, scale: 4 })
  value!: string;

  @Column({ type: 'jsonb', default: {} })
  conditions!: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}

@Entity('delivery_fee_slabs')
export class DeliveryFeeSlabEntity extends BaseEntity {
  @Column({ name: 'zone_id', type: 'uuid', nullable: true })
  zoneId?: string | null;

  @Column({ name: 'min_km', type: 'decimal', precision: 8, scale: 2 })
  minKm!: string;

  @Column({ name: 'max_km', type: 'decimal', precision: 8, scale: 2 })
  maxKm!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  fee!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
