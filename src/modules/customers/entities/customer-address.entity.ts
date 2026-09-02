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

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lat?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  lng?: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
}
