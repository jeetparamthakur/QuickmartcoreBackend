import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LedgerEntryType } from '../../../common/enums';

@Entity('ledger_entries')
export class LedgerEntryEntity extends BaseEntity {
  @Column({ type: 'enum', enum: LedgerEntryType })
  type!: LedgerEntryType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Index()
  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId!: string;

  @Column({ name: 'reference_type', type: 'varchar', length: 100 })
  referenceType!: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;
}
