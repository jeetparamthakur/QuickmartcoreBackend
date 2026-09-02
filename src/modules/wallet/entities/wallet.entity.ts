import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { WalletOwnerType } from '../../../common/enums';

@Entity('wallets')
export class WalletEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId!: string;

  @Column({ name: 'owner_type', type: 'enum', enum: WalletOwnerType })
  ownerType!: WalletOwnerType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0' })
  balance!: string;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;
}
