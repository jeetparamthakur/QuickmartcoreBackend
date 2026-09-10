import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { SellerProductEntity } from './entities/seller-product.entity';
import { ProductsRepository } from './products.repository';
import {
  findDummyProductById,
  listDummyByStoreId,
  paginateDummyCatalog,
} from './dummy-catalog';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async list(
    page: number,
    limit: number,
    categoryId?: string,
    storeId?: string,
    q?: string,
  ): Promise<PaginatedResult<SellerProductEntity>> {
    const filters = { categoryId, storeId, q };
    try {
      const result = await this.repo.findSellerProductsPaginated(
        page,
        limit,
        filters,
      );
      if (result.data.length > 0) {
        return result;
      }
    } catch {
      // Fall through to dummy catalog until live seller_products exist.
    }
    return paginateDummyCatalog(
      page,
      limit,
      filters,
    ) as PaginatedResult<SellerProductEntity>;
  }

  async getById(id: string) {
    const product = await this.repo.findSellerProductById(id);
    if (product) {
      return product;
    }
    const dummy = findDummyProductById(id);
    if (dummy) {
      return dummy as unknown as SellerProductEntity;
    }
    throw new NotFoundException({
      message: 'Product not found',
      errorCode: 'PRODUCT_NOT_FOUND',
    });
  }

  async listByStore(storeId: string) {
    const products = await this.repo.findByStoreId(storeId);
    if (products.length > 0) {
      return products;
    }
    return listDummyByStoreId(storeId) as unknown as SellerProductEntity[];
  }
}
