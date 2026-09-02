import { CustomerProfileEntity } from './entities/customer-profile.entity';

export interface CustomersRepositoryPort {
  findByUserId(userId: string): Promise<CustomerProfileEntity | null>;
  findById(id: string): Promise<CustomerProfileEntity | null>;
  create(data: Partial<CustomerProfileEntity>): Promise<CustomerProfileEntity>;
}

export const CUSTOMERS_REPOSITORY = Symbol('CUSTOMERS_REPOSITORY');
