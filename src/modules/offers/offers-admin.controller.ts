import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { OffersService } from './offers.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { OfferStatus } from '../../common/enums';

class CreateOfferDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  discountPercent?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;

  @IsOptional()
  @IsString()
  linkedCouponCode?: string;
}

@Controller('admin/offers')
export class OffersAdminController {
  constructor(private readonly service: OffersService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateOfferDto) {
    return this.service.create({
      ...dto,
      linkedCouponCode: dto.linkedCouponCode?.trim().toUpperCase() ?? null,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateOfferDto>,
  ) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.linkedCouponCode !== undefined) {
      patch.linkedCouponCode =
        dto.linkedCouponCode?.trim().toUpperCase() ?? null;
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
}
