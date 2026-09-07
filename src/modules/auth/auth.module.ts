import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSessionEntity } from './entities/user-session.entity';
import { AdminProfileEntity } from '../admin/entities/admin-profile.entity';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { CustomerProfileEntity } from '../customers/entities/customer-profile.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionsRepository } from './sessions.repository';
import { SESSIONS_REPOSITORY } from './sessions.repository.port';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from '../customers/customers.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { OtpModule } from '../otp/otp.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      UserSessionEntity,
      AdminProfileEntity,
      SellerProfileEntity,
      StoreOwnerProfileEntity,
      DeliveryPartnerProfileEntity,
      CustomerProfileEntity,
    ]),
    UsersModule,
    CustomersModule,
    AccessControlModule,
    OtpModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    { provide: SESSIONS_REPOSITORY, useClass: SessionsRepository },
  ],
  exports: [AuthService, TokenService, SESSIONS_REPOSITORY],
})
export class AuthModule {}
