import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerProductEntity } from './entities/seller-product.entity';
import { MasterProductEntity } from './entities/master-product.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(SellerProductEntity)
    private readonly sellerProducts: Repository<SellerProductEntity>,
    @InjectRepository(MasterProductEntity)
    private readonly masterProducts: Repository<MasterProductEntity>,
  ) {}

  async findSellerProductsPaginated(
    page: number,
    limit: number,
    filters: { categoryId?: string; storeId?: string; q?: string },
  ): Promise<PaginatedResult<SellerProductEntity>> {
    const qb = this.sellerProducts
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.masterProduct', 'mp')
      .leftJoinAndSelect('sp.store', 'store')
      .leftJoinAndSelect('sp.independentSeller', 'is')
      .leftJoinAndSelect('sp.inventory', 'inv')
      .where('sp.is_active = true')
      .andWhere('sp.deleted_at IS NULL');

    if (filters.categoryId) {
      qb.andWhere('mp.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.storeId) {
      qb.andWhere('sp.store_id = :storeId', { storeId: filters.storeId });
    }
    if (filters.q) {
      qb.andWhere('(sp.title ILIKE :q OR mp.name ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }

    const [data, total] = await qb
      .orderBy('sp.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  findSellerProductById(id: string) {
    return this.sellerProducts.findOne({
      where: { id, isActive: true },
      relations: ['masterProduct', 'store', 'independentSeller', 'inventory'],
    });
  }

  findByStoreId(storeId: string) {
    return this.sellerProducts.find({
      where: { storeId, isActive: true },
      relations: ['masterProduct', 'inventory'],
    });
  }

  createSellerProduct(data: Partial<SellerProductEntity>) {
    return this.sellerProducts.save(this.sellerProducts.create(data));
  }

  updateSellerProduct(
    id: string,
    data: Pick<SellerProductEntity, 'title' | 'mrp' | 'sellingPrice' | 'isActive'>,
  ) {
    return this.sellerProducts.update(id, data);
  }
}
