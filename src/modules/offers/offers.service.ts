import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferEntity } from './entities/offer.entity';
import { OfferStatus } from '../../common/enums';

@Injectable()
export class OffersRepository {
  constructor(
    @InjectRepository(OfferEntity)
    private readonly repo: Repository<OfferEntity>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActive() {
    const now = new Date();
    return this.repo
      .createQueryBuilder('o')
      .where('o.status = :status', { status: OfferStatus.ACTIVE })
      .andWhere('(o.starts_at IS NULL OR o.starts_at <= :now)', { now })
      .andWhere('(o.expires_at IS NULL OR o.expires_at >= :now)', { now })
      .orderBy('o.created_at', 'DESC')
      .getMany();
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<OfferEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<OfferEntity>) {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}

@Injectable()
export class OffersService {
  constructor(private readonly repo: OffersRepository) {}

  list() {
    return this.repo.findAll();
  }

  listActive() {
    return this.repo.findActive();
  }

  async get(id: string) {
    const offer = await this.repo.findById(id);
    if (!offer) {
      throw new NotFoundException({
        message: 'Offer not found',
        errorCode: 'OFFER_NOT_FOUND',
      });
    }
    return offer;
  }

  create(data: Partial<OfferEntity>) {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<OfferEntity>) {
    await this.get(id);
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.get(id);
    return this.repo.remove(id);
  }
}
