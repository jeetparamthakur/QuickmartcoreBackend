import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BannerPlacement } from '../../common/enums';
import { BannerEntity } from './entities/banner.entity';

@Injectable()
export class BannersRepository {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly repo: Repository<BannerEntity>,
  ) {}

  findAll() {
    return this.repo.find({ order: { sortOrder: 'ASC' } });
  }

  findActive(placement?: BannerPlacement) {
    const where: { isActive: boolean; placement?: BannerPlacement } = {
      isActive: true,
    };
    if (placement) {
      where.placement = placement;
    }
    return this.repo.find({ where, order: { sortOrder: 'ASC' } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<BannerEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<BannerEntity>) {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}

@Injectable()
export class BannersService {
  constructor(private readonly repo: BannersRepository) {}

  list() {
    return this.repo.findAll();
  }

  listActive(placement?: BannerPlacement) {
    return this.repo.findActive(placement);
  }

  async get(id: string) {
    const banner = await this.repo.findById(id);
    if (!banner) {
      throw new NotFoundException({
        message: 'Banner not found',
        errorCode: 'BANNER_NOT_FOUND',
      });
    }
    return banner;
  }

  create(data: Partial<BannerEntity>) {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<BannerEntity>) {
    await this.get(id);
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.get(id);
    return this.repo.remove(id);
  }
}
