import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletOwnerType, WalletTransactionType } from '../../common/enums';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly wallets: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly transactions: Repository<WalletTransactionEntity>,
  ) {}

  findByOwner(ownerId: string, ownerType: WalletOwnerType) {
    return this.wallets.findOne({ where: { ownerId, ownerType } });
  }

  createWallet(data: Partial<WalletEntity>) {
    return this.wallets.save(this.wallets.create(data));
  }

  saveWallet(wallet: WalletEntity) {
    return this.wallets.save(wallet);
  }

  saveTransaction(data: Partial<WalletTransactionEntity>) {
    return this.transactions.save(this.transactions.create(data));
  }

  findTransactions(walletId: string) {
    return this.transactions.find({
      where: { walletId },
      order: { createdAt: 'DESC' },
    });
  }
}

@Injectable()
export class WalletService {
  constructor(private readonly repo: WalletRepository) {}

  async getOrCreateWallet(ownerId: string, ownerType: WalletOwnerType) {
    let wallet = await this.repo.findByOwner(ownerId, ownerType);
    if (!wallet) {
      wallet = await this.repo.createWallet({
        ownerId,
        ownerType,
        balance: '0',
      });
    }
    return wallet;
  }

  async getWallet(ownerId: string, ownerType: WalletOwnerType) {
    const wallet = await this.repo.findByOwner(ownerId, ownerType);
    if (!wallet) {
      throw new NotFoundException({
        message: 'Wallet not found',
        errorCode: 'WALLET_NOT_FOUND',
      });
    }
    return wallet;
  }

  async credit(
    ownerId: string,
    ownerType: WalletOwnerType,
    amount: string,
    referenceId?: string,
    description?: string,
  ) {
    const wallet = await this.getOrCreateWallet(ownerId, ownerType);
    const newBalance = (
      parseFloat(wallet.balance) + parseFloat(amount)
    ).toFixed(2);
    wallet.balance = newBalance;
    await this.repo.saveWallet(wallet);

    await this.repo.saveTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.CREDIT,
      amount,
      balanceAfter: newBalance,
      referenceId,
      description,
    });

    return wallet;
  }

  async debit(
    ownerId: string,
    ownerType: WalletOwnerType,
    amount: string,
    referenceId?: string,
    description?: string,
  ) {
    const wallet = await this.getWallet(ownerId, ownerType);
    if (parseFloat(wallet.balance) < parseFloat(amount)) {
      throw new BadRequestException({
        message: 'Insufficient wallet balance',
        errorCode: 'INSUFFICIENT_BALANCE',
      });
    }

    const newBalance = (
      parseFloat(wallet.balance) - parseFloat(amount)
    ).toFixed(2);
    wallet.balance = newBalance;
    await this.repo.saveWallet(wallet);

    await this.repo.saveTransaction({
      walletId: wallet.id,
      type: WalletTransactionType.DEBIT,
      amount,
      balanceAfter: newBalance,
      referenceId,
      description,
    });

    return wallet;
  }

  getTransactions(ownerId: string, ownerType: WalletOwnerType) {
    return this.getWallet(ownerId, ownerType).then((w) =>
      this.repo.findTransactions(w.id),
    );
  }
}
