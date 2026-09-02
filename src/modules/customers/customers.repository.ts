import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomersRepositoryPort } from './customers.repository.port';

@Injectable()
export class CustomersRepository implements CustomersRepositoryPort {
  constructor(
    @InjectRepository(CustomerProfileEntity)
    private readonly repo: Repository<CustomerProfileEntity>,
  ) {}

  findByUserId(userId: string) {
    return this.repo.findOne({ where: { userId } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<CustomerProfileEntity>) {
    return this.repo.save(this.repo.create(data));
  }
}
