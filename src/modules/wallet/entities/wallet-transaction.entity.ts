import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WalletTransactionType } from '../../../common/enums';
import { WalletEntity } from './wallet.entity';

@Entity('wallet_transactions')
export class WalletTransactionEntity extends BaseEntity {
  @Index()
  @Column({ name: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @Column({ type: 'enum', enum: WalletTransactionType })
  type!: WalletTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @Column({ name: 'balance_after', type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  referenceId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @ManyToOne(() => WalletEntity)
  @JoinColumn({ name: 'wallet_id' })
  wallet!: WalletEntity;
}
