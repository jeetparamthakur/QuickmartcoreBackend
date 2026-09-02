import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { PayoutsService } from './payouts.service';
import { RequirePermissions, AuthenticatedUser } from '../../common/decorators/auth.decorators';
import { SellerType } from '../../common/enums';

class CreatePayoutDto {
  @IsUUID()
  beneficiaryId!: string;

  @IsEnum(SellerType)
  beneficiaryType!: SellerType;

  @IsString()
  amount!: string;
}

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @RequirePermissions('admin:all')
  list() {
    return this.payoutsService.listPayouts();
  }

  @Get(':id')
  @RequirePermissions('admin:all')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.payoutsService.getPayout(id);
  }

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreatePayoutDto) {
    return this.payoutsService.createPayout(dto);
  }

  @Post(':id/approve')
  @RequirePermissions('admin:all')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.payoutsService.approvePayout(id, req.user.id);
  }
}
