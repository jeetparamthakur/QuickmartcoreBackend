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

  findAll(filters?: {
    storeId?: string;
    independentSellerId?: string;
    createdByUserId?: string;
  }) {
    const qb = this.repo
      .createQueryBuilder('c')
      .orderBy('c.created_at', 'DESC');

    if (filters?.storeId) {
      qb.andWhere('c.store_id = :storeId', { storeId: filters.storeId });
    }
    if (filters?.independentSellerId) {
      qb.andWhere('c.independent_seller_id = :independentSellerId', {
        independentSellerId: filters.independentSellerId,
      });
    }
    if (filters?.createdByUserId) {
      qb.andWhere('c.created_by_user_id = :createdByUserId', {
        createdByUserId: filters.createdByUserId,
      });
    }

    return qb.getMany();
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  findByCode(code: string) {
    return this.repo
      .createQueryBuilder('c')
      .where('UPPER(c.code) = :code', { code: code.toUpperCase() })
      .getOne();
  }

  create(data: Partial<CouponEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async update(id: string, data: Partial<CouponEntity>) {
    await this.repo.update(
      id,
      data as Parameters<Repository<CouponEntity>['update']>[1],
    );
    return this.findById(id);
  }

  async remove(id: string) {
    await this.repo.delete(id);
  }

  async incrementUsedCount(id: string) {
    await this.repo.increment({ id }, 'usedCount', 1);
  }
}

@Injectable()
export class CouponsService {
  constructor(private readonly repo: CouponsRepository) {}

  list(filters?: {
    storeId?: string;
    independentSellerId?: string;
    createdByUserId?: string;
  }) {
    return this.repo.findAll(filters);
  }

  async get(id: string) {
    const coupon = await this.repo.findById(id);
    if (!coupon) {
      throw new NotFoundException({
        message: 'Coupon not found',
        errorCode: 'COUPON_NOT_FOUND',
      });
    }
    return coupon;
  }

  create(data: Partial<CouponEntity>) {
    if (data.code) {
      data.code = data.code.trim().toUpperCase();
    }
    return this.repo.create(data);
  }

  async update(id: string, data: Partial<CouponEntity>) {
    await this.get(id);
    if (data.code) {
      data.code = data.code.trim().toUpperCase();
    }
    return this.repo.update(id, data);
  }

  async remove(id: string) {
    await this.get(id);
    return this.repo.remove(id);
  }
}
