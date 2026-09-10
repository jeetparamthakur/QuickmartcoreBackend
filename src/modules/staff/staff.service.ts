import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnerType, StaffRole, UserType } from '../../common/enums';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import {
  StoreStaffEntity,
  StaffPermissions,
} from './entities/store-staff.entity';

const ROLE_PERMISSIONS: Record<StaffRole, StaffPermissions> = {
  [StaffRole.STORE_MANAGER]: {
    manageOrders: true,
    manageProducts: true,
    manageInventory: true,
    viewEarnings: true,
  },
  [StaffRole.ORDER_MANAGER]: {
    manageOrders: true,
    manageProducts: false,
    manageInventory: false,
    viewEarnings: false,
  },
  [StaffRole.INVENTORY_MANAGER]: {
    manageOrders: false,
    manageProducts: false,
    manageInventory: true,
    viewEarnings: false,
  },
};

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StoreStaffEntity)
    private readonly staffRepo: Repository<StoreStaffEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
  ) {}

  async listStaff(userId: string, userType: UserType) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) return [];

    const staff = await this.staffRepo.find({
      where: { storeOwnerId: owner.id },
      order: { createdAt: 'DESC' },
    });

    return staff.map((member) => this.formatStaff(member));
  }

  async createStaff(userId: string, userType: UserType, dto: CreateStaffDto) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) {
      throw new BadRequestException('Only store partners can manage staff');
    }

    let storeId = dto.storeId ?? null;
    if (storeId) {
      const store = await this.stores.findOne({
        where: { id: storeId, storeOwnerId: owner.id },
      });
      if (!store) throw new NotFoundException('Store not found');
    } else {
      const defaultStore = await this.stores.findOne({
        where: { storeOwnerId: owner.id },
        order: { createdAt: 'ASC' },
      });
      storeId = defaultStore?.id ?? null;
    }

    const member = this.staffRepo.create({
      storeOwnerId: owner.id,
      storeId,
      fullName: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      role: dto.role,
      permissions: ROLE_PERMISSIONS[dto.role],
    });

    const saved = await this.staffRepo.save(member);
    return this.formatStaff(saved);
  }

  async deleteStaff(userId: string, userType: UserType, staffId: string) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) {
      throw new BadRequestException('Only store partners can manage staff');
    }

    const member = await this.staffRepo.findOne({
      where: { id: staffId, storeOwnerId: owner.id },
    });
    if (!member) throw new NotFoundException('Staff member not found');

    await this.staffRepo.softRemove(member);
    return { success: true };
  }

  private async resolveStoreOwnerProfile(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      return this.storeOwnerProfiles.findOne({ where: { userId } });
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType !== PartnerType.STORE) return null;
    return this.storeOwnerProfiles.findOne({ where: { userId } });
  }

  private formatStaff(member: StoreStaffEntity) {
    return {
      id: member.id,
      name: member.fullName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      storeId: member.storeId ?? '',
      permissions: member.permissions,
      createdAt: member.createdAt.toISOString(),
    };
  }
}
