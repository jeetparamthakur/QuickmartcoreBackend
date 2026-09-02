import { Injectable } from '@nestjs/common';
import { UserType } from '../../common/enums';

@Injectable()
export class PermissionEvaluationService {
  evaluate(
    userType: UserType,
    permissions: string[],
    required: string[],
  ): boolean {
    if (userType === UserType.SUPER_ADMIN) return true;
    if (permissions.includes('superadmin:all')) return true;
    if (permissions.includes('admin:all') && required.every((p) => !p.startsWith('superadmin:'))) {
      return true;
    }
    return required.every((p) => permissions.includes(p));
  }

  hasPermission(
    userType: UserType,
    permissions: string[],
    permission: string,
  ): boolean {
    return this.evaluate(userType, permissions, [permission]);
  }
}
