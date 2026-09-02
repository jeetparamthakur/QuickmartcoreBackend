import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { FinanceRepositoryPort } from './finance.repository.port';

@Injectable()
export class FinanceRepository implements FinanceRepositoryPort {
  constructor(
    @InjectRepository(LedgerEntryEntity)
    private readonly repo: Repository<LedgerEntryEntity>,
  ) {}

  writeEntry(data: Partial<LedgerEntryEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findByReference(referenceId: string) {
    return this.repo.find({ where: { referenceId }, order: { createdAt: 'ASC' } });
  }
}
