import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType, StoreStatus } from '../../common/enums';
import { AdminCrudService } from './admin-crud.service';
import { IsEnum } from 'class-validator';

class StoreStatusDto {
  @IsEnum(StoreStatus)
  status!: StoreStatus;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class AdminCrudController {
  constructor(private readonly adminCrud: AdminCrudService) {}

  @Get('permissions/effective')
  effectivePermissions(@Req() req: { user: AuthenticatedUser }) {
    return this.adminCrud.getEffectivePermissions(req.user.id);
  }

  @Get('stores')
  @RequirePermissions('admin:all')
  listStores() {
    return this.adminCrud.listStores();
  }

  @Patch('stores/:id/status')
  @RequirePermissions('admin:all')
  updateStoreStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StoreStatusDto,
  ) {
    return this.adminCrud.updateStoreStatus(id, dto.status);
  }

  @Get('customers')
  @RequirePermissions('admin:all')
  listCustomers() {
    return this.adminCrud.listCustomers();
  }

  @Get('orders')
  @RequirePermissions('admin:all')
  listOrders() {
    return this.adminCrud.listOrders();
  }

  @Get('orders/:id')
  @RequirePermissions('admin:all')
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCrud.getOrder(id);
  }

  @Get('sellers')
  @RequirePermissions('admin:all')
  listSellers() {
    return this.adminCrud.listSellers();
  }

  @Get('delivery-partners')
  @RequirePermissions('admin:all')
  listPartners() {
    return this.adminCrud.listDeliveryPartners();
  }

  @Get('delivery/live')
  @RequirePermissions('admin:all')
  liveDeliveries() {
    return this.adminCrud.listDeliveryPartners();
  }

  @Get('finance/summary')
  @RequirePermissions('admin:all')
  financeSummary() {
    return this.adminCrud.getFinanceSummary();
  }
}
