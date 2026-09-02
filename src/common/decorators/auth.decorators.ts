import { SetMetadata } from '@nestjs/common';
import { UserType } from '../enums';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserType[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const CURRENT_USER_KEY = 'currentUser';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: UserType;
  sessionId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  sessionId: string;
  permissions: string[];
  sellerProfileId?: string;
  storeOwnerProfileId?: string;
  partnerProfileId?: string;
  customerProfileId?: string;
}
