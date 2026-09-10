import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  AuthenticatedUser,
} from '../decorators/auth.decorators';
import { PermissionEvaluationService } from '../../modules/access-control/permission-evaluation.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionEvaluation: PermissionEvaluationService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const allowed = this.permissionEvaluation.evaluate(
      user.userType,
      user.permissions,
      required,
    );
    if (!allowed) {
      throw new ForbiddenException({
        message: 'Access denied',
        errorCode: 'ACCESS_DENIED',
      });
    }
    return true;
  }
}
