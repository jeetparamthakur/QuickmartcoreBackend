import { Column, Entity, Index, OneToMany, OneToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { UserStatus, UserType } from '../../../common/enums';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { SellerProfileEntity } from '../../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../../stores/entities/store-owner-profile.entity';
import { DeliveryPartnerProfileEntity } from '../../delivery-partners/entities/delivery-partner-profile.entity';
import { AdminProfileEntity } from '../../admin/entities/admin-profile.entity';
import { UserSessionEntity } from '../../auth/entities/user-session.entity';
import { UserRoleEntity } from '../../access-control/entities/user-role.entity';

@Entity('users')
export class UserEntity extends SoftDeleteEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'user_type', type: 'enum', enum: UserType })
  userType!: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt?: Date | null;

  @OneToOne(() => CustomerProfileEntity, (p) => p.user)
  customerProfile?: CustomerProfileEntity;

  @OneToOne(() => SellerProfileEntity, (p) => p.user)
  sellerProfile?: SellerProfileEntity;

  @OneToOne(() => StoreOwnerProfileEntity, (p) => p.user)
  storeOwnerProfile?: StoreOwnerProfileEntity;

  @OneToOne(() => DeliveryPartnerProfileEntity, (p) => p.user)
  deliveryPartnerProfile?: DeliveryPartnerProfileEntity;

  @OneToOne(() => AdminProfileEntity, (p) => p.user)
  adminProfile?: AdminProfileEntity;

  @OneToMany(() => UserSessionEntity, (s) => s.user)
  sessions?: UserSessionEntity[];

  @OneToMany(() => UserRoleEntity, (ur) => ur.user)
  userRoles?: UserRoleEntity[];
}
