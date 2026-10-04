import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellerProductEntity } from './entities/seller-product.entity';
import { MasterProductEntity } from './entities/master-product.entity';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { PartnerType } from '../../common/enums';

export type ProductListFilters = {
  categoryId?: string;
  storeId?: string;
  independentSellerId?: string;
  q?: string;
  productType?: 'food' | 'retail';
  partnerType?: PartnerType;
  storeIds?: string[];
};

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
    filters: ProductListFilters,
  ): Promise<PaginatedResult<SellerProductEntity>> {
    const qb = this.sellerProducts
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.masterProduct', 'mp')
      .leftJoinAndSelect('sp.store', 'store')
      .leftJoinAndSelect('sp.independentSeller', 'indSeller')
      .leftJoinAndSelect('sp.inventory', 'inv')
      .leftJoin('store.storeOwner', 'storeOwner')
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
    if (filters.storeIds?.length) {
      qb.andWhere('sp.store_id IN (:...storeIds)', {
        storeIds: filters.storeIds,
      });
    }
    if (filters.independentSellerId) {
      qb.andWhere('sp.independent_seller_id = :independentSellerId', {
        independentSellerId: filters.independentSellerId,
      });
    }
    if (filters.q) {
      qb.andWhere('(sp.title ILIKE :q OR mp.name ILIKE :q)', {
        q: `%${filters.q}%`,
      });
    }
    if (filters.productType === 'food') {
      qb.andWhere("mp.attributes->>'productType' = 'food'");
    }
    if (filters.productType === 'retail') {
      qb.andWhere(
        "(mp.attributes->>'productType' IS NULL OR mp.attributes->>'productType' != 'food')",
      );
    }
    if (filters.partnerType) {
      qb.andWhere('storeOwner.partner_type = :partnerType', {
        partnerType: filters.partnerType,
      });
    }

    const [data, total] = await qb
      .orderBy('sp.createdAt', 'DESC')
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

  findSellerProductByIdForAccess(id: string) {
    return this.sellerProducts.findOne({
      where: { id },
      relations: ['masterProduct', 'store', 'independentSeller', 'inventory'],
    });
  }

  findByIndependentSellerId(independentSellerId: string) {
    return this.sellerProducts.find({
      where: { independentSellerId },
      relations: ['masterProduct', 'inventory'],
      order: { createdAt: 'DESC' },
    });
  }

  findByStoreId(storeId: string) {
    return this.sellerProducts.find({
      where: { storeId },
      relations: ['masterProduct', 'inventory'],
      order: { createdAt: 'DESC' },
    });
  }

  createSellerProduct(data: Partial<SellerProductEntity>) {
    return this.sellerProducts.save(this.sellerProducts.create(data));
  }

  createMasterProduct(data: Partial<MasterProductEntity>) {
    return this.masterProducts.save(this.masterProducts.create(data));
  }

  findMasterProductById(id: string) {
    return this.masterProducts.findOne({ where: { id } });
  }

  saveMasterProduct(master: MasterProductEntity) {
    return this.masterProducts.save(master);
  }

  updateSellerProduct(
    id: string,
    data: Partial<
      Pick<SellerProductEntity, 'title' | 'mrp' | 'sellingPrice' | 'isActive'>
    >,
  ) {
    return this.sellerProducts.update(id, data);
  }

  async softDeleteSellerProduct(id: string) {
    const product = await this.sellerProducts.findOne({ where: { id } });
    if (!product) return null;
    await this.sellerProducts.softRemove(product);
    return product;
  }
}
