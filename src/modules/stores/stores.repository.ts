import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreEntity } from './entities/store.entity';

@Injectable()
export class StoresRepository {
  constructor(
    @InjectRepository(StoreEntity)
    private readonly repo: Repository<StoreEntity>,
  ) {}

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findAllActive() {
    return this.repo.find({ where: { status: 'ACTIVE' as StoreEntity['status'] } });
  }

  create(data: Partial<StoreEntity>) {
    return this.repo.save(this.repo.create(data));
  }
}
