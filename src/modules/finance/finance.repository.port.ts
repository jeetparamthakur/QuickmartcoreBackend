import { LedgerEntryEntity } from './entities/ledger-entry.entity';

export interface WriteLedgerEntryInput {
  type: string;
  amount: string;
  referenceId: string;
  referenceType: string;
  metadata?: Record<string, unknown>;
}

export interface FinanceRepositoryPort {
  writeEntry(data: Partial<LedgerEntryEntity>): Promise<LedgerEntryEntity>;
  findByReference(referenceId: string): Promise<LedgerEntryEntity[]>;
}

export const FINANCE_REPOSITORY = Symbol('FINANCE_REPOSITORY');
