import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlagEntity } from './entities/feature-flag.entity';

@Injectable()
export class FeatureFlagsRepository {
  constructor(
    @InjectRepository(FeatureFlagEntity)
    private readonly repo: Repository<FeatureFlagEntity>,
  ) {}

  findAll() {
    return this.repo.find({ order: { key: 'ASC' } });
  }

  findByKey(key: string) {
    return this.repo.findOne({ where: { key } });
  }

  create(data: Partial<FeatureFlagEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<FeatureFlagEntity>) {
    const { metadata: _m, ...updateData } = data;
    void _m;
    await this.repo.update(id, updateData);
    return this.repo.findOne({ where: { id } });
  }
}

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly repo: FeatureFlagsRepository) {}

  list() {
    return this.repo.findAll();
  }

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.repo.findByKey(key);
    return flag?.isEnabled ?? false;
  }

  async get(key: string) {
    const flag = await this.repo.findByKey(key);
    if (!flag) {
      throw new NotFoundException({
        message: 'Feature flag not found',
        errorCode: 'FEATURE_FLAG_NOT_FOUND',
      });
    }
    return flag;
  }

  create(data: Partial<FeatureFlagEntity>) {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<FeatureFlagEntity>) {
    return this.repo.update(id, data);
  }

  async toggle(key: string, isEnabled: boolean) {
    const flag = await this.get(key);
    return this.repo.update(flag.id, { isEnabled });
  }
}
