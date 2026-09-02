import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { FeatureFlagsService } from './feature-flags.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

class CreateFeatureFlagDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

@Controller('admin/feature-flags')
export class FeatureFlagsController {
  constructor(private readonly service: FeatureFlagsService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.list();
  }

  @Get(':key')
  @RequirePermissions('admin:all')
  get(@Param('key') key: string) {
    return this.service.get(key);
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateFeatureFlagDto) {
    return this.service.create(dto);
  }

  @Patch(':key')
  @RequirePermissions('admin:all')
  toggle(@Param('key') key: string, @Body() dto: { isEnabled: boolean }) {
    return this.service.toggle(key, dto.isEnabled);
  }
}
