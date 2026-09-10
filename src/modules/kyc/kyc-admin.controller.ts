import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { KycStatus, UserType } from '../../common/enums';
import { KycService } from './kyc.service';
import { ReviewKycDto } from './dto/kyc.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class KycAdminController {
  constructor(private readonly kycService: KycService) {}

  @Get('kyc')
  @RequirePermissions('admin:all')
  listKyc(@Query('status') status?: string) {
    const valid = Object.values(KycStatus).includes(status as KycStatus)
      ? (status as KycStatus)
      : undefined;
    return this.kycService.listForAdmin(valid);
  }

  @Get('requests')
  @RequirePermissions('admin:all')
  listRequests(
    @Query('status') status?: string,
    @Query('partnerType') partnerType?: string,
  ) {
    const validStatus = Object.values(KycStatus).includes(status as KycStatus)
      ? (status as KycStatus)
      : undefined;
    return this.kycService.listRequestsForAdmin({
      status: validStatus,
      partnerType,
    });
  }

  @Get('requests/:userId')
  @RequirePermissions('admin:all')
  getRequest(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.kycService.getRequestDetailForAdmin(userId);
  }

  @Patch('requests/:userId')
  @RequirePermissions('admin:all')
  reviewRequest(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.reviewRequest(userId, dto);
  }

  @Get('sellers/:userId/kyc')
  @RequirePermissions('admin:all')
  getKyc(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.kycService.getRequestDetailForAdmin(userId);
  }

  @Patch('sellers/:userId/kyc')
  @RequirePermissions('admin:all')
  reviewKyc(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.reviewRequest(userId, dto);
  }
}
