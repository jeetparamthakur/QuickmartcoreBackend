import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
import { DeliveryPartnerAppService } from './delivery-partner-app.service';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

class UpdateAppProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;
}

class BankDetailsDto {
  @IsString()
  @IsNotEmpty()
  accountHolderName!: string;

  @IsString()
  @IsNotEmpty()
  bankName!: string;

  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @IsString()
  @IsNotEmpty()
  ifscCode!: string;
}

class CompleteOnboardingDto {
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails!: BankDetailsDto;
}

class RegisterDeviceDto {
  @IsString()
  pushToken!: string;
}

class AdvanceTripStatusDto {
  @IsOptional()
  @IsString()
  status?: string;
}

@Controller('delivery-partner')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.DELIVERY_PARTNER)
export class DeliveryPartnerController {
  constructor(
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly trackingService: DeliveryTrackingService,
    private readonly profileService: DeliveryPartnerProfileService,
    private readonly appService: DeliveryPartnerAppService,
  ) {}

  private partnerId(req: { user: AuthenticatedUser }) {
    return req.user.partnerProfileId ?? req.user.id;
  }

  @Post('register')
  register(@Req() req: { user: AuthenticatedUser }, @Body() dto: RegisterDto) {
    return this.profileService.register(req.user.id, dto);
  }

  @Get('profile')
  getProfile(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: UpdateAppProfileDto,
  ) {
    return this.appService.updateProfile(req.user.id, dto);
  }

  @Post('onboarding/complete')
  completeOnboarding(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.appService.completeOnboarding(req.user.id, dto.bankDetails);
  }

  @Post('onboarding/dev-approve')
  devApprove(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.devApprovePartner(req.user.id);
  }

  @Get('session')
  session(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getSession(this.partnerId(req));
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: { scope?: string; storeId?: string; sellerId?: string },
  ) {
    return this.appService.updateDeliveryPreferences(this.partnerId(req), dto);
  }

  @Get('stores/nearby')
  nearbyStores(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('lat and lng query parameters are required');
    }
    const radius = radiusKm != null ? Number(radiusKm) : 15;
    return this.appService.listNearbyStores(latitude, longitude, radius);
  }

  @Get('sellers/nearby')
  nearbySellers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('lat and lng query parameters are required');
    }
    const radius = radiusKm != null ? Number(radiusKm) : 15;
    return this.appService.listNearbySellers(latitude, longitude, radius);
  }

  @Get('kyc/status')
  kycStatus(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getKycStatus(req.user.id);
  }

  @Post('kyc/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadKyc(
    @Req() req: { user: AuthenticatedUser; body: { type?: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const type = req.body?.type ?? 'aadhaar';
    return this.appService.uploadKycDocument(req.user.id, type, file);
  }

  @Get('bank')
  bankDetails(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getBankDetails(req.user.id);
  }

  @Get('requests')
  listRequests(
    @Req() req: { user: AuthenticatedUser },
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('scope') scope?: string,
    @Query('storeId') storeId?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.appService.listRequests(req.user.id, this.partnerId(req), {
      lat,
      lng,
      scope,
      storeId,
      sellerId,
    });
  }

  @Post('requests/:id/accept')
  acceptRequest(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appService.acceptRequest(id, this.partnerId(req));
  }

  @Post('requests/:id/reject')
  rejectRequest(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appService.rejectRequest(id, this.partnerId(req));
  }

  @Get('trips/active')
  activeTrip(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getActiveTrip(this.partnerId(req));
  }

  @Post('trips/active/advance')
  advanceTrip(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.advanceTrip(this.partnerId(req));
  }

  @Patch('trips/active/status')
  updateTripStatus(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: AdvanceTripStatusDto,
  ) {
    return this.appService.updateTripStatus(
      this.partnerId(req),
      dto.status ?? '',
    );
  }

  @Get('payouts')
  payouts() {
    return [];
  }

  @Get('shifts')
  shifts() {
    return [];
  }

  @Post('devices')
  registerDevice(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.appService.registerDevice(req.user.id, dto.pushToken);
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
  setPreference(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: PreferenceDto,
  ) {
    return this.profileService.updatePreference(req.user.id, dto.preference);
  }

  @Get('earnings')
  earnings(@Req() req: { user: AuthenticatedUser }) {
    return this.appService.getEarnings(this.partnerId(req));
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
  updateLocation(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: UpdateLocationDto,
  ) {
    return this.trackingService.updateLocation(
      this.partnerId(req),
      dto.lat,
      dto.lng,
    );
  }

  @Get('location')
  getLocation(@Req() req: { user: AuthenticatedUser }) {
    return this.trackingService.getCurrentLocation(this.partnerId(req));
  }

  @Patch('online-status')
  setOnline(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: SetOnlineDto,
  ) {
    return this.trackingService.setOnlineStatus(
      this.partnerId(req),
      dto.isOnline,
    );
  }
}
