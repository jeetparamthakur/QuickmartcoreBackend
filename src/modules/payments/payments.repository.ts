import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsRepositoryPort } from './payments.repository.port';

@Injectable()
export class PaymentsRepository implements PaymentsRepositoryPort {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repo: Repository<PaymentEntity>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByIdempotencyKey(key: string) {
    return this.repo.findOne({ where: { idempotencyKey: key } });
  }

  create(data: Partial<PaymentEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<PaymentEntity>) {
    const { parentOrder: _parentOrder, ...updateData } = data;
    await this.repo.update(id, updateData);
    const updated = await this.findById(id);
    return updated!;
  }
}
