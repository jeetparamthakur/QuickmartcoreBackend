import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PayoutStatus, SellerType } from '../../../common/enums';

@Entity('payouts')
export class PayoutEntity extends BaseEntity {
  @Index()
  @Column({ name: 'beneficiary_id', type: 'uuid' })
  beneficiaryId!: string;

  @Column({ name: 'beneficiary_type', type: 'enum', enum: SellerType })
  beneficiaryType!: SellerType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status!: PayoutStatus;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy?: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;
}
