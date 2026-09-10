import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { UserType } from '../../common/enums';
import { UserEntity } from '../users/entities/user.entity';
import { ACCESS_CONTROL_REPOSITORY } from './access-control.repository';
import type { AccessControlRepositoryPort } from './access-control.repository';

const PERMISSIONS = [
  { key: 'cart:read', description: 'View cart' },
  { key: 'cart:write', description: 'Modify cart' },
  { key: 'orders:read', description: 'View orders' },
  { key: 'orders:write', description: 'Create/cancel orders' },
  { key: 'products:read', description: 'View products' },
  { key: 'seller:products:write', description: 'Manage seller products' },
  { key: 'seller:inventory:write', description: 'Manage inventory' },
  { key: 'admin:all', description: 'Full admin access' },
  { key: 'superadmin:all', description: 'Full super admin access' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  CUSTOMER: [
    'cart:read',
    'cart:write',
    'orders:read',
    'orders:write',
    'products:read',
  ],
  SELLER: ['seller:products:write', 'seller:inventory:write', 'products:read'],
  STORE_OWNER: [
    'seller:products:write',
    'seller:inventory:write',
    'products:read',
  ],
  DELIVERY_PARTNER: ['products:read'],
  ADMIN: ['admin:all', 'products:read'],
  SUPER_ADMIN: ['superadmin:all', 'admin:all', 'products:read'],
};

@Injectable()
export class AccessControlSeedService implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(RoleEntity)
    private readonly rolesRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepo: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissionsRepo: Repository<RolePermissionEntity>,
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @Inject(ACCESS_CONTROL_REPOSITORY)
    private readonly accessControlRepo: AccessControlRepositoryPort,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureSchemaReady();

    const count = await this.rolesRepo.count();
    if (count === 0) {
      await this.seedRolesAndPermissions();
    }
    await this.ensureAdminRoleAssignments();
  }

  private async ensureSchemaReady() {
    const shouldSync =
      this.config.get<string>('nodeEnv') !== 'production' ||
      this.config.get<boolean>('dbSyncOnStart') === true;
    if (!shouldSync) return;

    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    await this.dataSource.synchronize();
  }

  private async seedRolesAndPermissions() {
    const permissionMap = new Map<string, PermissionEntity>();
    for (const p of PERMISSIONS) {
      const saved = await this.permissionsRepo.save(
        this.permissionsRepo.create(p),
      );
      permissionMap.set(p.key, saved);
    }

    for (const roleName of Object.values(UserType)) {
      const role = await this.rolesRepo.save(
        this.rolesRepo.create({ name: roleName, description: roleName }),
      );
      const keys = ROLE_PERMISSIONS[roleName] ?? [];
      for (const key of keys) {
        const permission = permissionMap.get(key);
        if (!permission) continue;
        await this.rolePermissionsRepo.save(
          this.rolePermissionsRepo.create({
            roleId: role.id,
            permissionId: permission.id,
          }),
        );
      }
    }
  }

  private async ensureAdminRoleAssignments() {
    const panelUsers = await this.usersRepo.find({
      where: {
        userType: In([UserType.ADMIN, UserType.SUPER_ADMIN]),
      },
      select: ['id', 'userType'],
    });

    for (const user of panelUsers) {
      await this.accessControlRepo.assignRole(user.id, user.userType);
    }
  }
}
