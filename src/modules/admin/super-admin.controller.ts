import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { UserType, UserStatus } from '../../common/enums';
import { Roles } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminControlService } from './admin-control.service';

class UpdateStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

class UpdateLoginAccessDto {
  @IsBoolean()
  enabled!: boolean;
}

class UpdateModulesDto {
  @IsObject()
  modules!: Record<string, boolean>;

  @IsOptional()
  @IsString()
  reason?: string;
}

class UpdateFeaturesDto {
  @IsString()
  module!: string;

  @IsObject()
  features!: Record<string, boolean>;
}

class UpdateActionsDto {
  @IsObject()
  actions!: Record<string, boolean>;
}

class TemporaryRestrictionDto {
  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  feature?: string;

  @IsString()
  from!: string;

  @IsString()
  until!: string;

  @IsBoolean()
  autoRestore!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('super-admin/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly adminControl: AdminControlService) {}

  @Get()
  getAdmin() {
    return this.adminControl.getAdminProfileResponse();
  }

  @Patch('status')
  updateStatus(@Body() dto: UpdateStatusDto) {
    return this.adminControl.updateStatus(dto.status);
  }

  @Patch('login-access')
  updateLoginAccess(@Body() dto: UpdateLoginAccessDto) {
    return this.adminControl.updateLoginAccess(dto.enabled);
  }

  @Post('force-logout')
  forceLogout() {
    return this.adminControl.forceLogout();
  }

  @Post('terminate-sessions')
  terminateSessions() {
    return this.adminControl.terminateSessions();
  }

  @Post('emergency-lock')
  emergencyLock() {
    return this.adminControl.emergencyLock();
  }

  @Post('emergency-unlock')
  emergencyUnlock() {
    return this.adminControl.emergencyUnlock();
  }

  @Post('restore-full-access')
  restoreFullAccess() {
    return this.adminControl.restoreFullAccess();
  }

  @Get('permissions')
  getPermissions() {
    return this.adminControl.getPermissions();
  }

  @Get('effective-permissions')
  getEffectivePermissions() {
    return this.adminControl.getEffectivePermissions();
  }

  @Put('permissions/modules')
  updateModules(@Body() dto: UpdateModulesDto) {
    return this.adminControl.updateModulePermissions(dto.modules, dto.reason);
  }

  @Put('permissions/features')
  updateFeatures(@Body() dto: UpdateFeaturesDto) {
    return this.adminControl.updateFeaturePermissions(dto.module, dto.features);
  }

  @Put('permissions/actions')
  updateActions(@Body() dto: UpdateActionsDto) {
    return this.adminControl.updateActionPermissions(dto.actions);
  }

  @Post('permissions/temporary-restriction')
  addRestriction(@Body() dto: TemporaryRestrictionDto) {
    return this.adminControl.addTemporaryRestriction(dto);
  }

  @Delete('permissions/temporary-restriction/:id')
  removeRestriction(@Param('id') id: string) {
    return this.adminControl.removeTemporaryRestriction(id);
  }

  @Get('metrics')
  getMetrics() {
    return this.adminControl.getMetrics();
  }

  @Get('activity')
  getActivity(@Query('page') page?: string, @Query('module') module?: string) {
    return this.adminControl.getActivity(parseInt(page ?? '1', 10), module);
  }

  @Get('audit-logs')
  getAuditLogs(@Query('page') page?: string) {
    return this.adminControl.getActivity(parseInt(page ?? '1', 10));
  }

  @Get('restriction-audit-logs')
  getRestrictionAuditLogs(@Query('page') page?: string) {
    return {
      data: [],
      total: 0,
      page: parseInt(page ?? '1', 10),
      pageSize: 20,
    };
  }
}
