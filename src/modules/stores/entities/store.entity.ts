import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { StoreStatus } from '../../../common/enums';
import { StoreOwnerProfileEntity } from './store-owner-profile.entity';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('stores')
export class StoreEntity extends SoftDeleteEntity {
  @Index()
  @Column({ name: 'store_owner_id', type: 'uuid' })
  storeOwnerId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng?: string | null;

  @Column({
    name: 'service_radius_km',
    type: 'decimal',
    precision: 6,
    scale: 2,
    default: 5,
  })
  serviceRadiusKm!: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: object | null;

  @Column({ type: 'enum', enum: StoreStatus, default: StoreStatus.ACTIVE })
  status!: StoreStatus;

  @ManyToOne(() => StoreOwnerProfileEntity)
  @JoinColumn({ name: 'store_owner_id' })
  storeOwner!: StoreOwnerProfileEntity;

  @OneToMany(() => SellerProductEntity, (sp) => sp.store)
  sellerProducts?: SellerProductEntity[];
}
