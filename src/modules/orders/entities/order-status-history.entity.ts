import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ActorType, SubOrderStatus } from '../../../common/enums';
import { SubOrderEntity } from './sub-order.entity';

@Entity('order_status_history')
export class OrderStatusHistoryEntity extends BaseEntity {
  @Index()
  @Column({ name: 'sub_order_id', type: 'uuid' })
  subOrderId!: string;

  @Column({ name: 'from_status', type: 'enum', enum: SubOrderStatus, nullable: true })
  fromStatus?: SubOrderStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: SubOrderStatus })
  toStatus!: SubOrderStatus;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'actor_type', type: 'enum', enum: ActorType })
  actorType!: ActorType;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @ManyToOne(() => SubOrderEntity, (so) => so.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sub_order_id' })
  subOrder!: SubOrderEntity;
}
