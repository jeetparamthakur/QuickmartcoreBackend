import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { WalletOwnerType } from '../../common/enums';
import { WalletService } from './wallet.service';

class WalletQueryDto {
  @IsEnum(WalletOwnerType)
  ownerType!: WalletOwnerType;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @RequirePermissions('orders:read')
  getWallet(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: WalletQueryDto,
  ) {
    return this.walletService.getOrCreateWallet(req.user.id, query.ownerType);
  }

  @Get('transactions')
  @RequirePermissions('orders:read')
  getTransactions(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: WalletQueryDto,
  ) {
    return this.walletService.getTransactions(req.user.id, query.ownerType);
  }
}
