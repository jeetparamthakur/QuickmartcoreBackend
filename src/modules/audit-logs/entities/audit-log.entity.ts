import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ActorType } from '../../../common/enums';

@Entity('audit_logs')
export class AuditLogEntity extends BaseEntity {
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string | null;

  @Column({ name: 'actor_type', type: 'enum', enum: ActorType })
  actorType!: ActorType;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100 })
  module!: string;

  @Column({ type: 'varchar', length: 100 })
  entity!: string;

  @Index()
  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue?: Record<string, unknown> | null;

  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue?: Record<string, unknown> | null;
}

@Entity('idempotency_keys')
export class IdempotencyKeyEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  key!: string;

  @Column({ name: 'response_body', type: 'jsonb' })
  responseBody!: Record<string, unknown>;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
