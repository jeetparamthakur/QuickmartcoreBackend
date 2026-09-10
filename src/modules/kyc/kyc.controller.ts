import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
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
import { UserType } from '../../common/enums';
import { KycService } from './kyc.service';
import { CompleteOnboardingDto, UpdateOnboardingDto } from './dto/kyc.dto';

@Controller('seller')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SELLER, UserType.STORE_OWNER)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('kyc/status')
  getStatus(@Req() req: { user: AuthenticatedUser }) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('kyc/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadDocument(
    @Req() req: { user: AuthenticatedUser; body: { type?: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    const type = req.body?.type ?? 'pan';
    return this.kycService.uploadDocument(req.user.id, type, file);
  }

  @Post('kyc/submit')
  submitKyc(@Req() req: { user: AuthenticatedUser }) {
    return this.kycService.submitKyc(req.user.id);
  }

  @Patch('onboarding')
  updateOnboarding(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.kycService.updateOnboarding(
      req.user.id,
      req.user.userType,
      dto,
    );
  }

  @Post('onboarding/complete')
  completeOnboarding(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.kycService.completeOnboarding(
      req.user.id,
      req.user.userType,
      dto,
    );
  }
}
