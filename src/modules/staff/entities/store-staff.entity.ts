import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { StaffRole } from '../../../common/enums';
import { StoreOwnerProfileEntity } from '../../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../../stores/entities/store.entity';

export type StaffPermissions = {
  manageOrders: boolean;
  manageProducts: boolean;
  manageInventory: boolean;
  viewEarnings: boolean;
};

@Entity('store_staff')
export class StoreStaffEntity extends SoftDeleteEntity {
  @Index()
  @Column({ name: 'store_owner_id', type: 'uuid' })
  storeOwnerId!: string;

  @Index()
  @Column({ name: 'store_id', type: 'uuid', nullable: true })
  storeId?: string | null;

  @Column({ name: 'full_name', type: 'varchar', length: 255 })
  fullName!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({ type: 'enum', enum: StaffRole })
  role!: StaffRole;

  @Column({ type: 'jsonb', default: {} })
  permissions!: StaffPermissions;

  @ManyToOne(() => StoreOwnerProfileEntity)
  @JoinColumn({ name: 'store_owner_id' })
  storeOwner!: StoreOwnerProfileEntity;

  @ManyToOne(() => StoreEntity, { nullable: true })
  @JoinColumn({ name: 'store_id' })
  store?: StoreEntity | null;
}
