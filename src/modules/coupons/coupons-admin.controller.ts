import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { CouponsService } from './coupons.service';
import { CouponEngineService } from './coupon-engine.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import {
  CouponCreatedByType,
  CouponScopeType,
  CouponType,
} from '../../common/enums';
import { AuthenticatedUser } from '../../common/decorators/auth.decorators';

export class CreateCouponDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEnum(CouponType)
  type!: CouponType;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  minOrderAmount?: string;

  @IsOptional()
  @IsString()
  maxDiscount?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(CouponScopeType)
  scopeType?: CouponScopeType;

  @IsOptional()
  @IsUUID()
  storeId?: string;

  @IsOptional()
  @IsUUID()
  independentSellerId?: string;
}

@Controller('admin/coupons')
export class CouponsAdminController {
  constructor(
    private readonly service: CouponsService,
    private readonly couponEngine: CouponEngineService,
  ) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.list();
  }

  @Get(':id')
  @RequirePermissions('admin:all')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  @RequirePermissions('admin:all')
  create(
    @Body() dto: CreateCouponDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    const scopeType = dto.scopeType ?? CouponScopeType.GLOBAL;
    this.assertScopeFields(scopeType, dto.storeId, dto.independentSellerId);

    return this.service.create({
      ...dto,
      scopeType,
      fundingSource: this.couponEngine.resolveFundingSource(scopeType),
      createdByType: CouponCreatedByType.ADMIN,
      createdByUserId: req.user?.id ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCouponDto>,
  ) {
    if (dto.scopeType) {
      this.assertScopeFields(
        dto.scopeType,
        dto.storeId,
        dto.independentSellerId,
      );
    }

    const patch: Record<string, unknown> = { ...dto };
    if (dto.scopeType) {
      patch.fundingSource = this.couponEngine.resolveFundingSource(
        dto.scopeType,
      );
    }
    if (dto.startsAt !== undefined) {
      patch.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    }
    if (dto.expiresAt !== undefined) {
      patch.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    return this.service.update(id, patch);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }

  private assertScopeFields(
    scopeType: CouponScopeType,
    storeId?: string,
    independentSellerId?: string,
  ) {
    if (scopeType === CouponScopeType.STORE && !storeId) {
      throw new BadRequestException(
        'storeId is required for store-scoped coupons',
      );
    }
    if (
      scopeType === CouponScopeType.INDEPENDENT_SELLER &&
      !independentSellerId
    ) {
      throw new BadRequestException(
        'independentSellerId is required for independent seller coupons',
      );
    }
    if (
      scopeType === CouponScopeType.GLOBAL &&
      (storeId || independentSellerId)
    ) {
      throw new BadRequestException(
        'Global coupons cannot target a store or seller',
      );
    }
  }
}
