import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { CommissionService } from './commission.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
} from './dto/create-commission-rule.dto';

@Controller('admin/commissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class CommissionAdminController {
  constructor(private readonly service: CommissionService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.listForAdmin();
  }

  @Get(':id')
  @RequirePermissions('admin:all')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getForAdmin(id);
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateCommissionRuleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommissionRuleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
