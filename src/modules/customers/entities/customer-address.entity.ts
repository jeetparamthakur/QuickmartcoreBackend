import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('customer_addresses')
export class CustomerAddressEntity extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ name: 'full_address', type: 'varchar', length: 500 })
  fullAddress!: string;

  @Column({ name: 'address_line', type: 'varchar', length: 255, nullable: true })
  addressLine?: string | null;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode?: string | null;

  @Column({ name: 'receiver_name', type: 'varchar', length: 100, nullable: true })
  receiverName?: string | null;

  @Column({ name: 'receiver_phone', type: 'varchar', length: 20, nullable: true })
  receiverPhone?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng?: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
}
