import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRoleEntity } from './entities/user-role.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RoleEntity } from './entities/role.entity';
import { UserType } from '../../common/enums';

export interface AccessControlRepositoryPort {
  getPermissionsForUser(userId: string): Promise<string[]>;
  assignRole(userId: string, roleName: UserType): Promise<void>;
}

export const ACCESS_CONTROL_REPOSITORY = Symbol('ACCESS_CONTROL_REPOSITORY');

@Injectable()
export class AccessControlRepository implements AccessControlRepositoryPort {
  constructor(
    @InjectRepository(UserRoleEntity)
    private readonly userRolesRepo: Repository<UserRoleEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionsRepo: Repository<RolePermissionEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepo: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: Repository<RoleEntity>,
  ) {}

  async getPermissionsForUser(userId: string): Promise<string[]> {
    const userRoles = await this.userRolesRepo.find({
      where: { userId },
      relations: ['role'],
    });
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur) => ur.roleId);
    const rolePermissions = await this.rolePermissionsRepo
      .createQueryBuilder('rp')
      .where('rp.role_id IN (:...roleIds)', { roleIds })
      .getMany();

    const permissionIds = [...new Set(rolePermissions.map((rp) => rp.permissionId))];
    if (permissionIds.length === 0) return [];

    const permissions = await this.permissionsRepo
      .createQueryBuilder('p')
      .where('p.id IN (:...permissionIds)', { permissionIds })
      .getMany();

    return permissions.map((p) => p.key);
  }

  async assignRole(userId: string, roleName: UserType): Promise<void> {
    const role = await this.rolesRepo.findOne({ where: { name: roleName } });
    if (!role) return;

    const existing = await this.userRolesRepo.findOne({
      where: { userId, roleId: role.id },
    });
    if (existing) return;

    await this.userRolesRepo.save(
      this.userRolesRepo.create({
        userId,
        roleId: role.id,
      }),
    );
  }
}
