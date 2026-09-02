import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload, AuthenticatedUser } from '../../../common/decorators/auth.decorators';
import { ACCESS_CONTROL_REPOSITORY } from '../../access-control/access-control.repository';
import type { AccessControlRepositoryPort } from '../../access-control/access-control.repository';
import { USERS_REPOSITORY } from '../../users/users.repository.port';
import type { UsersRepositoryPort } from '../../users/users.repository.port';
import { UserType } from '../../../common/enums';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { SellerProfileEntity } from '../../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../../stores/entities/store-owner-profile.entity';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(USERS_REPOSITORY) private usersRepo: UsersRepositoryPort,
    @Inject(ACCESS_CONTROL_REPOSITORY)
    private accessControlRepo: AccessControlRepositoryPort,
    @InjectRepository(CustomerProfileEntity)
    private readonly customerProfiles: Repository<CustomerProfileEntity>,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly deliveryPartnerProfiles: Repository<DeliveryPartnerProfileEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersRepo.findById(payload.sub);
    if (!user) throw new Error('User not found');
    const permissions = await this.accessControlRepo.getPermissionsForUser(user.id);

    const base: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      sessionId: payload.sessionId,
      permissions,
    };

    if (user.userType === UserType.CUSTOMER) {
      const profile = await this.customerProfiles.findOne({ where: { userId: user.id } });
      base.customerProfileId = profile?.id;
    } else if (user.userType === UserType.SELLER) {
      const profile = await this.sellerProfiles.findOne({ where: { userId: user.id } });
      base.sellerProfileId = profile?.id;
    } else if (user.userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({ where: { userId: user.id } });
      base.storeOwnerProfileId = profile?.id;
    } else if (user.userType === UserType.DELIVERY_PARTNER) {
      const profile = await this.deliveryPartnerProfiles.findOne({ where: { userId: user.id } });
      base.partnerProfileId = profile?.id;
    }

    return base;
  }
}
