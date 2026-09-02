import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { BannerPlacement } from '../../../common/enums';

@Entity('banners')
export class BannerEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl!: string;

  @Column({ name: 'link_url', type: 'varchar', length: 500, nullable: true })
  linkUrl?: string | null;

  @Column({ type: 'enum', enum: BannerPlacement, default: BannerPlacement.HOME_TOP })
  placement!: BannerPlacement;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
