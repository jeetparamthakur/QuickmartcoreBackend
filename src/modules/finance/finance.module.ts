import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { FinanceService } from './finance.service';
import { FinanceRepository } from './finance.repository';
import { FINANCE_REPOSITORY } from './finance.repository.port';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntryEntity])],
  providers: [
    FinanceService,
    FinanceRepository,
    { provide: FINANCE_REPOSITORY, useExisting: FinanceRepository },
  ],
  exports: [FinanceService],
})
export class FinanceModule {}
