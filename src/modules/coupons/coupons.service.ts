import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CouponEntity } from './entities/coupon.entity';

@Injectable()
export class CouponsRepository {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly repo: Repository<CouponEntity>,
  ) {}

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string) {
    return this.repo.findOne({ where: { code } });
  }

  create(data: Partial<CouponEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<CouponEntity>) {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }
}

@Injectable()
export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  list() {
    return this.repo.findAll();
  }

  async get(id: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) {
      throw new NotFoundException({ message: 'Coupon not found', errorCode: 'COUPON_NOT_FOUND' });
    }
    return coupon;
  }

  create(data: Partial<CouponEntity>) {
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CouponEntity>) {
    await this.get(id);
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.get(id);
    return this.repo.remove(id);
  }
}
