import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvertisementEntity } from './entities/advertisement.entity';

@Injectable()
export class AdvertisementsRepository {
  constructor(
    @InjectRepository(AdvertisementEntity)
    private readonly repo: Repository<AdvertisementEntity>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<AdvertisementEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<AdvertisementEntity>) {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}

@Injectable()
export class AdvertisementsService {
  constructor(private readonly repo: AdvertisementsRepository) {}

  list() {
    return this.repo.findAll();
  }

  async get(id: string) {
    const ad = await this.repo.findById(id);
    if (!ad) {
      throw new NotFoundException({ message: 'Advertisement not found', errorCode: 'AD_NOT_FOUND' });
    }
    return ad;
  }

  create(data: Partial<AdvertisementEntity>) {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<AdvertisementEntity>) {
    await this.get(id);
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.get(id);
    return this.repo.remove(id);
  }
}
