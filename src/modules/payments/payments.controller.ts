import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ConfirmPaymentDto } from './dto/payments.dto';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('confirm')
  @RequirePermissions('orders:write')
  confirm(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPayment(id);
  }
}
