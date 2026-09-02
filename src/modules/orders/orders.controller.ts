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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { OrdersService } from './orders.service';
import { Inject } from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from '../customers/customers.repository.port';
import type { CustomersRepositoryPort } from '../customers/customers.repository.port';

@Controller('customer/orders')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.CUSTOMER)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepo: CustomersRepositoryPort,
  ) {}

  @Get()
  @RequirePermissions('orders:read')
  async list(@Req() req: { user: AuthenticatedUser }) {
    const profile = await this.customersRepo.findByUserId(req.user.id);
    return this.ordersService.listCustomerOrders(profile!.id);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  async getOne(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const profile = await this.customersRepo.findByUserId(req.user.id);
    return this.ordersService.getCustomerOrder(id, profile!.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('orders:write')
  async cancel(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const profile = await this.customersRepo.findByUserId(req.user.id);
    return this.ordersService.cancelOrder(id, profile!.id);
  }
}
