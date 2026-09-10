import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CartService } from './cart.service';

class AddCartItemDto {
  @IsUUID()
  sellerProductId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class UpdateCartItemDto {
  @IsInt()
  @Min(0)
  quantity!: number;
}

class ApplyCouponDto {
  @IsString()
  code!: string;
}

class PreviewCartDto {
  @IsOptional()
  @IsString()
  couponCode?: string;
}

@Controller('customer/cart')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.CUSTOMER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @RequirePermissions('cart:read')
  getCart(@Req() req: { user: AuthenticatedUser }) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  @RequirePermissions('cart:write')
  addItem(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(
      req.user.id,
      dto.sellerProductId,
      dto.quantity,
    );
  }

  @Patch('items/:id')
  @RequirePermissions('cart:write')
  updateItem(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(req.user.id, id, dto.quantity);
  }

  @Delete('items/:id')
  @RequirePermissions('cart:write')
  removeItem(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.removeItem(req.user.id, id);
  }

  @Delete()
  @RequirePermissions('cart:write')
  clearCart(@Req() req: { user: AuthenticatedUser }) {
    return this.cartService.clearCart(req.user.id);
  }

  @Post('preview')
  @RequirePermissions('cart:read')
  preview(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: PreviewCartDto,
  ) {
    return this.cartService.previewCheckout(req.user.id, dto.couponCode);
  }

  @Post('coupon')
  @RequirePermissions('cart:write')
  applyCoupon(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: ApplyCouponDto,
  ) {
    return this.cartService.applyCoupon(req.user.id, dto.code);
  }

  @Delete('coupon')
  @RequirePermissions('cart:write')
  removeCoupon(@Req() req: { user: AuthenticatedUser }) {
    return this.cartService.removeCoupon(req.user.id);
  }
}
