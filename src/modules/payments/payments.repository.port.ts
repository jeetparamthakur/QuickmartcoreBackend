import { PaymentEntity } from './entities/payment.entity';

export interface ConfirmPaymentInput {
  parentOrderId: string;
  amount: string;
  method: string;
  idempotencyKey?: string;
  providerRef?: string;
}

export interface PaymentsRepositoryPort {
  findById(id: string): Promise<PaymentEntity | null>;
  findByIdempotencyKey(key: string): Promise<PaymentEntity | null>;
  create(data: Partial<PaymentEntity>): Promise<PaymentEntity>;
  update(id: string, data: Partial<PaymentEntity>): Promise<PaymentEntity>;
}

export const PAYMENTS_REPOSITORY = Symbol('PAYMENTS_REPOSITORY');
