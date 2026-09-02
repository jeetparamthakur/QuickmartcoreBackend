import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletEntity } from './entities/wallet.entity';
import { WalletTransactionEntity } from './entities/wallet-transaction.entity';
import { WalletController } from './wallet.controller';
import { WalletService, WalletRepository } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity, WalletTransactionEntity])],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService],
})
export class WalletModule {}
