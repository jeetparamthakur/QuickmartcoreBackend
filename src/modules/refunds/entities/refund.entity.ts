import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RefundStatus } from '../../../common/enums';
import { PaymentEntity } from '../../payments/entities/payment.entity';

@Entity('refunds')
export class RefundEntity extends BaseEntity {
  @Index()
  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: RefundStatus, default: RefundStatus.PENDING })
  status!: RefundStatus;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({
    name: 'provider_ref',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerRef?: string | null;

  @ManyToOne(() => PaymentEntity)
  @JoinColumn({ name: 'payment_id' })
  payment!: PaymentEntity;
}
