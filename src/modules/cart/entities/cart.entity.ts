import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CartStatus } from '../../../common/enums';
import { CustomerProfileEntity } from '../../customers/entities/customer-profile.entity';
import { CartItemEntity } from './cart-item.entity';

@Entity('carts')
export class CartEntity extends BaseEntity {
  @Index()
  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ type: 'enum', enum: CartStatus, default: CartStatus.ACTIVE })
  status!: CartStatus;

  @ManyToOne(() => CustomerProfileEntity)
  @JoinColumn({ name: 'customer_id' })
  customer!: CustomerProfileEntity;

  @OneToMany(() => CartItemEntity, (item) => item.cart)
  items?: CartItemEntity[];
}
