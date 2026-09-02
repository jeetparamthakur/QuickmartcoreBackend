import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CustomerLoginDto,
  CustomerRegisterDto,
  OtpSendDto,
  OtpVerifyDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('customer/register')
  register(@Body() dto: CustomerRegisterDto) {
    return this.authService.registerCustomer(dto);
  }

  @Public()
  @Post('customer/login')
  login(@Body() dto: CustomerLoginDto) {
    return this.authService.loginCustomer(dto);
  }

  @Public()
  @Post('super-admin/login')
  loginSuperAdmin(@Body() dto: CustomerLoginDto) {
    return this.authService.loginSuperAdmin(dto);
  }

  @Public()
  @Post('admin/login')
  loginAdmin(@Body() dto: CustomerLoginDto) {
    return this.authService.loginAdmin(dto);
  }

  @Public()
  @Post('otp/send')
  sendOtp(@Body() dto: OtpSendDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: { user: AuthenticatedUser }) {
    await this.authService.logout(req.user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: { user: AuthenticatedUser }) {
    return this.authService.getMe(req.user.id);
  }
}
