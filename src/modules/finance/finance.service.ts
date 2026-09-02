import { Inject, Injectable } from '@nestjs/common';
import { LedgerEntryType } from '../../common/enums';
import {
  FINANCE_REPOSITORY,
  WriteLedgerEntryInput,
} from './finance.repository.port';
import type { FinanceRepositoryPort } from './finance.repository.port';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(FINANCE_REPOSITORY)
    private readonly repo: FinanceRepositoryPort,
  ) {}

  writeEntry(input: WriteLedgerEntryInput) {
    return this.repo.writeEntry({
      type: input.type as LedgerEntryType,
      amount: input.amount,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      metadata: input.metadata ?? {},
    });
  }

  getEntriesForReference(referenceId: string) {
    return this.repo.findByReference(referenceId);
  }
}
