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
import { OffersService } from './offers.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

class CreateOfferDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
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
    return this.service.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('admin:all')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateOfferDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('admin:all')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
