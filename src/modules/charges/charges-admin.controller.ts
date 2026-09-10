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
import { ChargesService } from './charges.service';
import {
  CreateChargeRuleDto,
  UpdateChargeRuleDto,
} from './dto/create-charge-rule.dto';

@Controller('admin/charges')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class ChargesAdminController {
  constructor(private readonly service: ChargesService) {}

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
  create(@Body() dto: CreateChargeRuleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChargeRuleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
