import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/auth.decorators';
import { UserType } from '../enums';
import { AuthenticatedUser } from '../decorators/auth.decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserType[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const user = context.switchToHttp().getRequest().user as AuthenticatedUser;
    if (user.userType === UserType.SUPER_ADMIN) return true;
    if (!requiredRoles.includes(user.userType)) {
      throw new ForbiddenException({
        message: 'Access denied',
        errorCode: 'ACCESS_DENIED',
      });
    }
    return true;
  }
}
