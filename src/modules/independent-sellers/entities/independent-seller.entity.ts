import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SoftDeleteEntity } from '../../../common/entities/base.entity';
import { IndependentSellerStatus } from '../../../common/enums';
import { SellerProfileEntity } from '../../sellers/entities/seller-profile.entity';
import { SellerProductEntity } from '../../products/entities/seller-product.entity';

@Entity('independent_sellers')
export class IndependentSellerEntity extends SoftDeleteEntity {
  @Index()
  @Column({ name: 'seller_profile_id', type: 'uuid' })
  sellerProfileId!: string;

  @Column({ name: 'business_name', type: 'varchar', length: 255 })
  businessName!: string;

  @Column({
    name: 'pickup_lat',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  pickupLat?: string | null;

  @Column({
    name: 'pickup_lng',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  pickupLng?: string | null;

  @Column({
    type: 'enum',
    enum: IndependentSellerStatus,
    default: IndependentSellerStatus.ACTIVE,
  })
  status!: IndependentSellerStatus;

  @ManyToOne(() => SellerProfileEntity)
  @JoinColumn({ name: 'seller_profile_id' })
  sellerProfile!: SellerProfileEntity;

  @OneToMany(() => SellerProductEntity, (sp) => sp.independentSeller)
  sellerProducts?: SellerProductEntity[];
}
