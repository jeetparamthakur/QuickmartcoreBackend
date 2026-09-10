import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { BannersService } from './banners.service';
import {
  Public,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { BannerPlacement } from '../../common/enums';

class CreateBannerDto {
  @IsString()
  title!: string;

  @IsString()
  imageUrl!: string;

  @IsOptional()
  @IsString()
  linkUrl?: string;

  @IsOptional()
  @IsEnum(BannerPlacement)
  placement?: BannerPlacement;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Controller('admin/banners')
export class BannersAdminController {
  constructor(private readonly service: BannersService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateBannerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateBannerDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}

@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Public()
  @Get()
  listActive(@Query('placement') placement?: BannerPlacement) {
    return this.service.listActive(placement);
  }
}
