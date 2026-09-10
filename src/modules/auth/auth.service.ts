import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ApprovalStatus, UserType, UserStatus } from '../../common/enums';
import { USERS_REPOSITORY } from '../users/users.repository.port';
import type { UsersRepositoryPort } from '../users/users.repository.port';
import { CUSTOMERS_REPOSITORY } from '../customers/customers.repository.port';
import type { CustomersRepositoryPort } from '../customers/customers.repository.port';
import { ACCESS_CONTROL_REPOSITORY } from '../access-control/access-control.repository';
import type { AccessControlRepositoryPort } from '../access-control/access-control.repository';
import { SESSIONS_REPOSITORY } from './sessions.repository.port';
import type { SessionsRepositoryPort } from './sessions.repository.port';
import { TokenService } from './token.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminProfileEntity } from '../admin/entities/admin-profile.entity';
import {
  CustomerLoginDto,
  CustomerRegisterDto,
  OtpSendDto,
  OtpVerifyDto,
} from './dto/auth.dto';
import { OtpService } from '../otp/otp.service';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { DeliveryPartnerPreference } from '../../common/enums';

const OTP_ACCOUNT_TYPES: UserType[] = [
  UserType.CUSTOMER,
  UserType.SELLER,
  UserType.STORE_OWNER,
  UserType.DELIVERY_PARTNER,
];

@Injectable()
export class AuthService {
  constructor(
    @Inject(USERS_REPOSITORY) private usersRepo: UsersRepositoryPort,
    @Inject(CUSTOMERS_REPOSITORY)
    private customersRepo: CustomersRepositoryPort,
    @Inject(ACCESS_CONTROL_REPOSITORY)
    private accessControlRepo: AccessControlRepositoryPort,
    @Inject(SESSIONS_REPOSITORY) private sessionsRepo: SessionsRepositoryPort,
    private tokenService: TokenService,
    private otpService: OtpService,
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfiles: Repository<AdminProfileEntity>,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly deliveryPartnerProfiles: Repository<DeliveryPartnerProfileEntity>,
  ) {}

  async registerCustomer(dto: CustomerRegisterDto) {
    const existing = await this.usersRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        message: 'Email already registered',
        errorCode: 'EMAIL_EXISTS',
      });
    }

    const passwordHash = await this.tokenService.hashPassword(dto.password);
    const user = await this.usersRepo.create({
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      userType: UserType.CUSTOMER,
      status: UserStatus.ACTIVE,
    });

    await this.customersRepo.create({
      userId: user.id,
      fullName: dto.fullName,
    });

    await this.accessControlRepo.assignRole(user.id, UserType.CUSTOMER);

    return this.createSession(user.id, user.email, UserType.CUSTOMER);
  }

  async loginCustomer(dto: CustomerLoginDto) {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user || user.userType !== UserType.CUSTOMER) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const valid = await this.tokenService.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!valid) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    return this.createSession(user.id, user.email, user.userType);
  }

  async loginSuperAdmin(dto: CustomerLoginDto) {
    return this.loginPanelUser(dto, UserType.SUPER_ADMIN);
  }

  async loginAdmin(dto: CustomerLoginDto) {
    return this.loginPanelUser(dto, UserType.ADMIN);
  }

  sendOtp(dto: OtpSendDto) {
    return this.otpService.sendOtp(dto.phone);
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const phone = this.otpService.normalizePhone(dto.phone);
    const valid = this.otpService.verifyOtp(dto.phone, dto.otp);
    if (!valid) {
      throw new UnauthorizedException({
        message: 'Invalid or expired OTP',
        errorCode: 'INVALID_OTP',
      });
    }

    const userType = dto.userType ?? UserType.CUSTOMER;
    if (!OTP_ACCOUNT_TYPES.includes(userType)) {
      throw new UnauthorizedException({
        message: 'Invalid account type',
        errorCode: 'INVALID_ACCOUNT_TYPE',
      });
    }

    const lookupTypes =
      userType === UserType.SELLER || userType === UserType.STORE_OWNER
        ? [UserType.SELLER, UserType.STORE_OWNER]
        : [userType];

    let user = await this.usersRepo.findByPhoneAndUserTypes(phone, lookupTypes);
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const placeholderEmail = `${phone.replace(/\D/g, '')}.${userType.toLowerCase()}@phone.m3bd.local`;
      const passwordHash = await this.tokenService.hashPassword(
        `otp-${Date.now()}-${Math.random()}`,
      );
      user = await this.usersRepo.create({
        email: placeholderEmail,
        phone,
        passwordHash,
        userType,
        status: UserStatus.ACTIVE,
      });
      await this.accessControlRepo.assignRole(user.id, userType);
      await this.createProfileForUser(
        user.id,
        userType,
        dto.fullName ?? 'User',
      );
    }

    if (
      user.status === UserStatus.SUSPENDED ||
      user.status === UserStatus.BLOCKED
    ) {
      throw new UnauthorizedException({
        message: 'Account suspended',
        errorCode: 'USER_SUSPENDED',
      });
    }

    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    const session = await this.createSession(
      user.id,
      user.email,
      user.userType,
    );
    return { ...session, isNewUser };
  }

  private async createProfileForUser(
    userId: string,
    userType: UserType,
    fullName: string,
  ) {
    switch (userType) {
      case UserType.CUSTOMER:
        await this.customersRepo.create({ userId, fullName });
        break;
      case UserType.SELLER:
        await this.sellerProfiles.save(
          this.sellerProfiles.create({ userId, businessName: fullName }),
        );
        break;
      case UserType.STORE_OWNER:
        await this.storeOwnerProfiles.save(
          this.storeOwnerProfiles.create({ userId, fullName }),
        );
        break;
      case UserType.DELIVERY_PARTNER:
        await this.deliveryPartnerProfiles.save(
          this.deliveryPartnerProfiles.create({
            userId,
            fullName,
            preference: DeliveryPartnerPreference.BOTH,
            approvalStatus: ApprovalStatus.PENDING,
            isOnline: false,
          }),
        );
        break;
      default:
        break;
    }
  }

  private async loginPanelUser(dto: CustomerLoginDto, expectedType: UserType) {
    const user = await this.usersRepo.findByEmail(dto.email);
    if (!user || user.userType !== expectedType) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const adminProfile = await this.adminProfiles.findOne({
      where: { userId: user.id },
    });
    if (adminProfile?.emergencyLocked || adminProfile?.loginEnabled === false) {
      throw new UnauthorizedException({
        message: 'Admin access blocked',
        errorCode: 'ADMIN_ACCESS_BLOCKED',
      });
    }

    const valid = await this.tokenService.verifyPassword(
      user.passwordHash,
      dto.password,
    );
    if (!valid) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    await this.accessControlRepo.assignRole(user.id, expectedType);
    await this.usersRepo.update(user.id, { lastLoginAt: new Date() });
    return this.createSession(user.id, user.email, user.userType);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; sessionId: string };
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }

    const session = await this.sessionsRepo.findById(payload.sessionId);
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException({
        message: 'Session expired',
        errorCode: 'SESSION_EXPIRED',
      });
    }

    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    if (tokenHash !== session.refreshTokenHash) {
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        errorCode: 'INVALID_REFRESH_TOKEN',
      });
    }

    const user = await this.usersRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    await this.sessionsRepo.revoke(session.id);
    return this.createSession(user.id, user.email, user.userType);
  }

  async logout(sessionId: string) {
    await this.sessionsRepo.revoke(sessionId);
  }

  async getMe(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    if (user.userType === UserType.CUSTOMER) {
      const profile = await this.customersRepo.findByUserId(userId);
      const permissions =
        await this.accessControlRepo.getPermissionsForUser(userId);
      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          fullName: profile?.fullName,
        },
        permissions,
      };
    }

    if (user.userType === UserType.SELLER) {
      const profile = await this.sellerProfiles.findOne({ where: { userId } });
      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          fullName: profile?.businessName,
        },
      };
    }

    if (user.userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          fullName: profile?.fullName,
        },
      };
    }

    if (user.userType === UserType.DELIVERY_PARTNER) {
      const profile = await this.deliveryPartnerProfiles.findOne({
        where: { userId },
      });
      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          userType: user.userType,
          status: user.status,
          fullName: profile?.fullName,
        },
      };
    }

    const adminProfile = await this.adminProfiles.findOne({
      where: { userId },
    });

    return {
      user: {
        id: user.id,
        name: adminProfile?.fullName ?? user.email,
        email: user.email,
        role: user.userType,
      },
      session: {
        id: 'current',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    };
  }

  private async createSession(
    userId: string,
    email: string,
    userType: UserType,
  ) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await this.sessionsRepo.create({
      userId,
      refreshTokenHash: '',
      expiresAt,
    });

    const accessToken = this.tokenService.signAccessToken({
      sub: userId,
      email,
      userType,
      sessionId: session.id,
    });

    const refreshToken = this.tokenService.signRefreshToken({
      sub: userId,
      sessionId: session.id,
    });

    await this.sessionsRepo.updateRefreshTokenHash(
      session.id,
      this.tokenService.hashRefreshToken(refreshToken),
    );

    const profile = await this.customersRepo.findByUserId(userId);
    const adminProfile = await this.adminProfiles.findOne({
      where: { userId },
    });

    return {
      user: {
        id: userId,
        email,
        role: userType,
        name: adminProfile?.fullName ?? profile?.fullName ?? email,
      },
      session: { id: session.id, expiresAt: expiresAt.toISOString() },
      token: accessToken,
      refreshToken,
    };
  }
}
