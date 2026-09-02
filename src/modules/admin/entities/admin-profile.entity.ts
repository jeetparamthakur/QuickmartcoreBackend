import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserStatus } from '../../../common/enums';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('admin_profiles')
export class AdminProfileEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  mobile?: string | null;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  accountStatus!: UserStatus;

  @Column({ name: 'login_enabled', type: 'boolean', default: true })
  loginEnabled!: boolean;

  @Column({ name: 'emergency_locked', type: 'boolean', default: false })
  emergencyLocked!: boolean;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt?: Date | null;

  @Column({ name: 'is_super_admin', type: 'boolean', default: false })
  isSuperAdmin!: boolean;

  @OneToOne(() => UserEntity, (u) => u.adminProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}

@Entity('admin_permissions')
export class AdminPermissionsEntity extends BaseEntity {
  @Column({ name: 'admin_profile_id', type: 'uuid', unique: true })
  adminProfileId!: string;

  @Column({ name: 'permission_version', type: 'int', default: 1 })
  permissionVersion!: number;

  @Column({ name: 'module_permissions', type: 'jsonb' })
  modulePermissions!: Record<string, boolean>;

  @Column({ name: 'feature_permissions', type: 'jsonb', default: {} })
  featurePermissions!: Record<string, Record<string, boolean>>;

  @Column({ name: 'action_permissions', type: 'jsonb' })
  actionPermissions!: Record<string, boolean>;

  @Column({ name: 'temporary_restrictions', type: 'jsonb', default: [] })
  temporaryRestrictions!: Array<Record<string, unknown>>;
}

@Entity('admin_activities')
export class AdminActivityEntity extends BaseEntity {
  @Column({ name: 'admin_profile_id', type: 'uuid' })
  adminProfileId!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100 })
  module!: string;

  @Column({ type: 'varchar', length: 100 })
  entity!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId!: string;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId?: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string | null;
}

@Entity('restriction_audit_logs')
export class RestrictionAuditLogEntity extends BaseEntity {
  @Column({ name: 'admin_profile_id', type: 'uuid' })
  adminProfileId!: string;

  @Column({ name: 'performed_by', type: 'varchar', length: 255 })
  performedBy!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  module?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  feature?: string | null;

  @Column({ name: 'old_value', type: 'text' })
  oldValue!: string;

  @Column({ name: 'new_value', type: 'text' })
  newValue!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;
}
