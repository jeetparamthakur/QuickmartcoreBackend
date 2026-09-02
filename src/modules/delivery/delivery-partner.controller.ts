import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType, DeliveryPartnerPreference } from '../../common/enums';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { DeliveryPartnerProfileService } from './delivery-partner-profile.service';
import { IsBoolean, IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

class UpdateLocationDto {
  @IsNumberString()
  lat!: string;

  @IsNumberString()
  lng!: string;
}

class SetOnlineDto {
  @IsBoolean()
  isOnline!: boolean;
}

class RegisterDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsEnum(DeliveryPartnerPreference)
  preference?: DeliveryPartnerPreference;
}

class PreferenceDto {
  @IsEnum(DeliveryPartnerPreference)
  preference!: DeliveryPartnerPreference;
}

@Controller('delivery-partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.DELIVERY_PARTNER)
export class DeliveryPartnerController {
  constructor(
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly trackingService: DeliveryTrackingService,
    private readonly profileService: DeliveryPartnerProfileService,
  ) {}

  private partnerId(req: { user: AuthenticatedUser }) {
    return req.user.partnerProfileId ?? req.user.id;
  }

  @Post('register')
  register(@Req() req: { user: AuthenticatedUser }, @Body() dto: RegisterDto) {
    return this.profileService.register(req.user.id, dto);
  }

  @Get('me')
  getMe(@Req() req: { user: AuthenticatedUser }) {
    return this.profileService.getByUserId(req.user.id);
  }

  @Get('dashboard')
  dashboard(@Req() req: { user: AuthenticatedUser }) {
    return this.profileService.getDashboard(req.user.id);
  }

  @Patch('preference')
  setPreference(@Req() req: { user: AuthenticatedUser }, @Body() dto: PreferenceDto) {
    return this.profileService.updatePreference(req.user.id, dto.preference);
  }

  @Get('earnings')
  earnings(@Req() req: { user: AuthenticatedUser }) {
    return this.profileService.getEarnings(this.partnerId(req));
  }

  @Get('assignments')
  listAssignments(@Req() req: { user: AuthenticatedUser }) {
    return this.assignmentService.listPendingForPartner(this.partnerId(req));
  }

  @Get('assignments/active')
  listActive(@Req() req: { user: AuthenticatedUser }) {
    return this.profileService.listActive(this.partnerId(req));
  }

  @Post('assignments/:id/accept')
  acceptAssignment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.accept(id, this.partnerId(req));
  }

  @Post('assignments/:id/reject')
  rejectAssignment(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assignmentService.reject(id, this.partnerId(req));
  }

  @Post('assignments/:id/pickup-confirm')
  confirmPickup(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profileService.confirmPickup(id, this.partnerId(req));
  }

  @Post('assignments/:id/deliver')
  confirmDelivery(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.profileService.confirmDelivery(id, this.partnerId(req));
  }

  @Patch('location')
  updateLocation(@Req() req: { user: AuthenticatedUser }, @Body() dto: UpdateLocationDto) {
    return this.trackingService.updateLocation(this.partnerId(req), dto.lat, dto.lng);
  }

  @Get('location')
  getLocation(@Req() req: { user: AuthenticatedUser }) {
    return this.trackingService.getCurrentLocation(this.partnerId(req));
  }

  @Patch('online-status')
  setOnline(@Req() req: { user: AuthenticatedUser }, @Body() dto: SetOnlineDto) {
    return this.trackingService.setOnlineStatus(this.partnerId(req), dto.isOnline);
  }
}
