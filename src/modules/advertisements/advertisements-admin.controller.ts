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
import { IsOptional, IsString } from 'class-validator';
import { AdvertisementsService } from './advertisements.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

class CreateAdvertisementDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

@Controller('admin/advertisements')
export class AdvertisementsAdminController {
  constructor(private readonly service: AdvertisementsService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateAdvertisementDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateAdvertisementDto>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
