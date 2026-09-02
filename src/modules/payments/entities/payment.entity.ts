import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { PaymentMethod, PaymentStatus } from '../../../common/enums';
import { ParentOrderEntity } from '../../orders/entities/parent-order.entity';

@Entity('payments')
export class PaymentEntity extends BaseEntity {
  @Index()
  @Column({ name: 'parent_order_id', type: 'uuid' })
  parentOrderId!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ type: 'enum', enum: PaymentMethod })
  method!: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ name: 'provider_ref', type: 'varchar', length: 255, nullable: true })
  providerRef?: string | null;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string | null;

  @ManyToOne(() => ParentOrderEntity)
  @JoinColumn({ name: 'parent_order_id' })
  parentOrder!: ParentOrderEntity;
}
