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
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { CouponsService } from './coupons.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';
import { CouponType } from '../../common/enums';

class CreateCouponDto {
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
  @IsInt()
  usageLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('admin/coupons')
export class CouponsAdminController {
  constructor(private readonly service: CouponsService) {}

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
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateCouponDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
