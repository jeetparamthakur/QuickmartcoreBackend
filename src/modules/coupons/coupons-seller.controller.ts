import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import {
  CouponCreatedByType,
  CouponScopeType,
  PartnerType,
  UserType,
} from '../../common/enums';
import { CouponsService } from './coupons.service';
import { CouponEngineService } from './coupon-engine.service';
import { CreateCouponDto } from './coupons-admin.controller';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';

@Controller('seller/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SELLER, UserType.STORE_OWNER)
export class CouponsSellerController {
  constructor(
    private readonly service: CouponsService,
    private readonly couponEngine: CouponEngineService,
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwners: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
  ) {}

  @Get()
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.listForSeller(req.user.id, req.user.userType);
  }

  @Get('store/:storeId')
  listForStore(
    @Req() req: { user: AuthenticatedUser },
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.service.list({ storeId, createdByUserId: req.user.id });
  }

  @Post()
  create(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateCouponDto,
  ) {
    return this.createForSeller(req.user.id, req.user.userType, dto);
  }

  @Patch(':id')
  update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCouponDto>,
  ) {
    return this.updateForSeller(req.user.id, req.user.userType, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.removeForSeller(req.user.id, id);
  }

  private async listForSeller(userId: string, userType: UserType) {
    const independent = await this.getIndependentSeller(userId);
    if (independent) {
      return this.service.list({
        independentSellerId: independent.id,
        createdByUserId: userId,
      });
    }

    const owner = await this.resolveStoreOwner(userId, userType);
    if (!owner) return [];
    const stores = await this.stores.find({
      where: { storeOwnerId: owner.id },
    });
    const all = await Promise.all(
      stores.map((store) =>
        this.service.list({ storeId: store.id, createdByUserId: userId }),
      ),
    );
    return all.flat();
  }

  private async createForSeller(
    userId: string,
    userType: UserType,
    dto: CreateCouponDto,
  ) {
    let scopeType = dto.scopeType;
    let storeId = dto.storeId;
    let independentSellerId = dto.independentSellerId;

    const independent = await this.getIndependentSeller(userId);
    if (independent && userType === UserType.SELLER && !dto.storeId) {
      scopeType = CouponScopeType.INDEPENDENT_SELLER;
      independentSellerId = independent.id;
      storeId = undefined;
    } else {
      if (!storeId) {
        throw new BadRequestException('storeId is required');
      }
      await this.assertStoreAccess(userId, userType, storeId);
      scopeType = CouponScopeType.STORE;
      independentSellerId = undefined;
    }

    return this.service.create({
      ...dto,
      scopeType: scopeType,
      storeId,
      independentSellerId,
      fundingSource: this.couponEngine.resolveFundingSource(scopeType),
      createdByType: CouponCreatedByType.SELLER,
      createdByUserId: userId,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  private async updateForSeller(
    userId: string,
    userType: UserType,
    id: string,
    dto: Partial<CreateCouponDto>,
  ) {
    const coupon = await this.service.get(id);
    if (coupon.createdByUserId !== userId) {
      throw new BadRequestException('You can only edit your own coupons');
    }
    if (dto.scopeType === CouponScopeType.GLOBAL) {
      throw new BadRequestException('Sellers cannot create global coupons');
    }
    if (dto.storeId) {
      await this.assertStoreAccess(userId, userType, dto.storeId);
    }
    return this.service.update(id, {
      ...dto,
      startsAt: dto.startsAt
        ? new Date(dto.startsAt)
        : dto.startsAt === null
          ? null
          : undefined,
      expiresAt: dto.expiresAt
        ? new Date(dto.expiresAt)
        : dto.expiresAt === null
          ? null
          : undefined,
    });
  }

  private async removeForSeller(userId: string, id: string) {
    const coupon = await this.service.get(id);
    if (coupon.createdByUserId !== userId) {
      throw new BadRequestException('You can only delete your own coupons');
    }
    return this.service.remove(id);
  }

  private async getIndependentSeller(userId: string) {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) return null;
    return this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
  }

  private async resolveStoreOwner(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      return this.storeOwners.findOne({ where: { userId } });
    }
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType !== PartnerType.STORE) return null;
    return this.storeOwners.findOne({ where: { userId } });
  }

  private async assertStoreAccess(
    userId: string,
    userType: UserType,
    storeId: string,
  ) {
    const owner = await this.resolveStoreOwner(userId, userType);
    if (!owner) throw new NotFoundException('Store not found');
    const store = await this.stores.findOne({
      where: { id: storeId, storeOwnerId: owner.id },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }
}
