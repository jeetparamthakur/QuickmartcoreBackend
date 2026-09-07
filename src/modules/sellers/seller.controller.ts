import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser, Roles } from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { SellerService } from './seller.service';

@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SELLER, UserType.STORE_OWNER)
export class SellerController {
  constructor(private readonly sellerService: SellerService) {}

  @Get('me')
  getProfile(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.getProfile(req.user.id, req.user.userType);
  }

  @Get('stores')
  @Roles(UserType.STORE_OWNER)
  listStores(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.listStores(req.user.id);
  }

  @Get('products')
  listProducts(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.listProducts(req.user.id, req.user.userType);
  }

  @Get('orders')
  listOrders(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.listOrders(req.user.id, req.user.userType);
  }

  @Get('earnings')
  getEarnings(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.getEarnings(req.user.id, req.user.userType);
  }

  @Get('orders/:id')
  getOrder(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sellerService.getOrder(req.user.id, req.user.userType, id);
  }

  @Post('orders/:id/:action')
  orderAction(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('action') action: string,
  ) {
    return this.sellerService.transitionOrder(
      req.user.id,
      req.user.userType,
      id,
      action.toUpperCase(),
    );
  }
}
