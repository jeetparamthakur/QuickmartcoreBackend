import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 150 })
  key!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @OneToMany(() => RolePermissionEntity, (rp) => rp.permission)
  rolePermissions?: RolePermissionEntity[];
}
