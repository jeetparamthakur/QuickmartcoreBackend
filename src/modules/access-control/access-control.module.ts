import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { UserRoleEntity } from './entities/user-role.entity';
import { AccessControlSeedService } from './access-control.seed.service';
import {
  AccessControlRepository,
  ACCESS_CONTROL_REPOSITORY,
} from './access-control.repository';
import { PermissionEvaluationService } from './permission-evaluation.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      RolePermissionEntity,
      UserRoleEntity,
    ]),
  ],
  providers: [
    AccessControlSeedService,
    PermissionEvaluationService,
    { provide: ACCESS_CONTROL_REPOSITORY, useClass: AccessControlRepository },
  ],
  exports: [ACCESS_CONTROL_REPOSITORY, PermissionEvaluationService],
})
export class AccessControlModule {}
