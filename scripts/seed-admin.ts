import { config as loadEnv } from 'dotenv';
loadEnv({ override: true });

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module';
import { UserType, UserStatus } from '../src/common/enums';
import { UserEntity } from '../src/modules/users/entities/user.entity';
import { AdminProfileEntity } from '../src/modules/admin/entities/admin-profile.entity';
import { RoleEntity } from '../src/modules/access-control/entities/role.entity';
import { UserRoleEntity } from '../src/modules/access-control/entities/user-role.entity';

const EMAIL = 'admin@m3bd.test';
const PASSWORD = 'admin123';

async function assignPanelRole(
  ds: DataSource,
  userId: string,
  roleName: UserType,
): Promise<void> {
  const role = await ds.getRepository(RoleEntity).findOne({
    where: { name: roleName },
  });
  if (!role) {
    console.warn(`Role ${roleName} not found — start the API once to seed roles.`);
    return;
  }
  const existing = await ds.getRepository(UserRoleEntity).findOne({
    where: { userId, roleId: role.id },
  });
  if (existing) return;
  await ds.getRepository(UserRoleEntity).save({ userId, roleId: role.id });
}

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const ds = app.get(DataSource);
  const usersRepo = ds.getRepository(UserEntity);
  const adminProfilesRepo = ds.getRepository(AdminProfileEntity);

  const passwordHash = await argon2.hash(PASSWORD);

  let user = await usersRepo.findOne({ where: { email: EMAIL } });

  if (user) {
    user.passwordHash = passwordHash;
    user.userType = UserType.ADMIN;
    user.status = UserStatus.ACTIVE;
    user = await usersRepo.save(user);
    console.log(`Updated admin user: ${EMAIL}`);
  } else {
    user = await usersRepo.save({
      email: EMAIL,
      passwordHash,
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
    });
    console.log(`Created admin user: ${EMAIL}`);
  }

  let profile = await adminProfilesRepo.findOne({ where: { userId: user.id } });
  if (profile) {
    profile.fullName = profile.fullName || 'Platform Admin';
    profile.isSuperAdmin = false;
    profile.loginEnabled = true;
    profile.emergencyLocked = false;
    profile.accountStatus = UserStatus.ACTIVE;
    await adminProfilesRepo.save(profile);
  } else {
    await adminProfilesRepo.save({
      userId: user.id,
      fullName: 'Platform Admin',
      isSuperAdmin: false,
      loginEnabled: true,
      emergencyLocked: false,
      accountStatus: UserStatus.ACTIVE,
    });
  }

  await assignPanelRole(ds, user.id, UserType.ADMIN);

  console.log('Admin credentials ready:', EMAIL, '/', PASSWORD);
  await app.close();
}

void seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
