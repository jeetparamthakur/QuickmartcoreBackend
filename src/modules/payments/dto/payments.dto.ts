import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from '../../../common/enums';

export class ConfirmPaymentDto {
  @IsUUID()
  parentOrderId!: string;

  @IsString()
  amount!: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  providerRef?: string;
}

export class CreateRefundDto {
  @IsUUID()
  paymentId!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
