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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  RequirePermissions,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { DeliveryPartnerPayService } from './delivery-partner-pay.service';
import {
  CreateDeliveryPartnerPaySlabDto,
  UpdateDeliveryPartnerPaySlabDto,
} from './dto/delivery-partner-pay-slab.dto';

@Controller('admin/delivery-partner-pay')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class DeliveryPartnerPayAdminController {
  constructor(private readonly service: DeliveryPartnerPayService) {}

  @Get('slabs')
  @RequirePermissions('admin:all')
  listSlabs(@Query('partnerProfileId') partnerProfileId?: string) {
    return this.service.listForAdmin(partnerProfileId ?? null);
  }

  @Get('partners/:partnerProfileId/slabs')
  @RequirePermissions('admin:all')
  listPartnerSlabs(
    @Param('partnerProfileId', ParseUUIDPipe) partnerProfileId: string,
  ) {
    return this.service.listForAdmin(partnerProfileId);
  }

  @Get('slabs/:id')
  @RequirePermissions('admin:all')
  getSlab(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getForAdmin(id);
  }

  @Post('slabs')
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateDeliveryPartnerPaySlabDto) {
    return this.service.create(dto);
  }

  @Patch('slabs/:id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryPartnerPaySlabDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete('slabs/:id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
