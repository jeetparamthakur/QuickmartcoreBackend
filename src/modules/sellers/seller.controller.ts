import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { SellerService } from './seller.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { CreateSellerProductDto } from './dto/create-seller-product.dto';
import { UpdateSellerProductDto } from './dto/update-seller-product.dto';
import { StoreContextQueryDto } from './dto/store-context-query.dto';

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
  listStores(@Req() req: { user: AuthenticatedUser }) {
    return this.sellerService.listStores(req.user.id, req.user.userType);
  }

  @Post('stores')
  createStore(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateStoreDto,
  ) {
    return this.sellerService.createStore(req.user.id, req.user.userType, dto);
  }

  @Get('stores/:id')
  getStore(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sellerService.getStore(req.user.id, req.user.userType, id);
  }

  @Patch('stores/:id')
  updateStore(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.sellerService.updateStore(
      req.user.id,
      req.user.userType,
      id,
      dto,
    );
  }

  @Get('products')
  listProducts(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.listProducts(
      req.user.id,
      req.user.userType,
      query.storeId,
    );
  }

  @Post('products')
  createProduct(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateSellerProductDto,
  ) {
    return this.sellerService.createProduct(
      req.user.id,
      req.user.userType,
      dto,
    );
  }

  @Get('products/:id')
  getProduct(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.getProduct(
      req.user.id,
      req.user.userType,
      id,
      query.storeId,
    );
  }

  @Patch('products/:id')
  updateProduct(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StoreContextQueryDto,
    @Body() dto: UpdateSellerProductDto,
  ) {
    return this.sellerService.updateProduct(
      req.user.id,
      req.user.userType,
      id,
      dto,
      query.storeId,
    );
  }

  @Delete('products/:id')
  deleteProduct(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.deleteProduct(
      req.user.id,
      req.user.userType,
      id,
      query.storeId,
    );
  }

  @Get('inventory')
  listInventory(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.listInventory(
      req.user.id,
      req.user.userType,
      query.storeId,
    );
  }

  @Patch('inventory/:id')
  updateInventory(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: StoreContextQueryDto,
    @Body() body: { quantity: number },
  ) {
    return this.sellerService.updateInventory(
      req.user.id,
      req.user.userType,
      id,
      body.quantity,
      query.storeId,
    );
  }

  @Get('orders')
  listOrders(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.listOrders(
      req.user.id,
      req.user.userType,
      query.storeId,
    );
  }

  @Get('earnings')
  getEarnings(
    @Req() req: { user: AuthenticatedUser },
    @Query() query: StoreContextQueryDto,
  ) {
    return this.sellerService.getEarnings(
      req.user.id,
      req.user.userType,
      query.storeId,
    );
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
