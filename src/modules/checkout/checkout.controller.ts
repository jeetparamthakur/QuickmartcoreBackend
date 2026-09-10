import { Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CheckoutService } from './checkout.service';

@Controller('customer/checkout')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.CUSTOMER)
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @RequirePermissions('orders:write')
  checkout(
    @Req() req: { user: AuthenticatedUser },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.checkoutService.checkout(req.user.id, idempotencyKey);
  }
}
