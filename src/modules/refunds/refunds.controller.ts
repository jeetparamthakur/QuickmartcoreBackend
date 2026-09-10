import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from '../payments/dto/payments.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateRefundDto) {
    return this.refundsService.createRefund(dto);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.refundsService.getRefund(id);
  }
}
