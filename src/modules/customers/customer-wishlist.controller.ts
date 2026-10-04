import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CustomerWishlistService } from './customer-wishlist.service';

class AddWishlistItemDto {
  @IsUUID()
  sellerProductId!: string;
}

@Controller('customer/wishlist')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.CUSTOMER)
export class CustomerWishlistController {
  constructor(private readonly wishlistService: CustomerWishlistService) {}

  @Get()
  @RequirePermissions('wishlist:read')
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.wishlistService.list(req.user.id);
  }

  @Get('ids')
  @RequirePermissions('wishlist:read')
  listIds(@Req() req: { user: AuthenticatedUser }) {
    return this.wishlistService.listIds(req.user.id);
  }

  @Post('items')
  @RequirePermissions('wishlist:write')
  add(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.add(req.user.id, dto.sellerProductId);
  }

  @Delete('items/:sellerProductId')
  @RequirePermissions('wishlist:write')
  remove(
    @Req() req: { user: AuthenticatedUser },
    @Param('sellerProductId', ParseUUIDPipe) sellerProductId: string,
  ) {
    return this.wishlistService.remove(req.user.id, sellerProductId);
  }
}
