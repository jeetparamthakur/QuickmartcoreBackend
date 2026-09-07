import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions, Roles } from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { KycService } from './kyc.service';
import { ReviewKycDto } from './dto/kyc.dto';

@Controller('admin/sellers')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class KycAdminController {
  constructor(private readonly kycService: KycService) {}

  @Patch(':userId/kyc')
  @RequirePermissions('admin:all')
  reviewKyc(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.reviewKyc(userId, dto);
  }
}
