import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { SellerProductEntity } from './entities/seller-product.entity';
import { ProductsRepository, ProductListFilters } from './products.repository';
import {
  findDummyProductById,
  listDummyByStoreId,
  paginateDummyCatalog,
} from './dummy-catalog';
import {
  mapSellerProductForCustomer,
  mapSellerProductsForCustomer,
} from './products-customer.mapper';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async list(
    page: number,
    limit: number,
    filters: ProductListFilters,
  ): Promise<PaginatedResult<ReturnType<typeof mapSellerProductForCustomer>>> {
    try {
      const result = await this.repo.findSellerProductsPaginated(
        page,
        limit,
        filters,
      );
      if (result.data.length > 0) {
        return {
          ...result,
          data: mapSellerProductsForCustomer(result.data),
        };
      }
    } catch {
      // Fall through to dummy catalog until live seller_products exist.
    }
    const dummy = paginateDummyCatalog(page, limit, filters);
    return {
      ...dummy,
      data: mapSellerProductsForCustomer(
        dummy.data as unknown as SellerProductEntity[],
      ),
    };
  }

  async getById(id: string) {
    const product = await this.repo.findSellerProductById(id);
    if (product) {
      return mapSellerProductForCustomer(product);
    }
    const dummy = findDummyProductById(id);
    if (dummy) {
      return mapSellerProductForCustomer(
        dummy as unknown as SellerProductEntity,
      );
    }
    throw new NotFoundException({
      message: 'Product not found',
      errorCode: 'PRODUCT_NOT_FOUND',
    });
  }

  async listByStore(storeId: string, productType?: 'food' | 'retail') {
    const products = await this.repo.findByStoreId(storeId);
    let list =
      products.length > 0
        ? products
        : (listDummyByStoreId(storeId) as unknown as SellerProductEntity[]);

    if (productType) {
      list = list.filter((p) => {
        const attrs = (p.masterProduct?.attributes ?? {}) as {
          productType?: string;
        };
        const isFood = attrs.productType === 'food';
        return productType === 'food' ? isFood : !isFood;
      });
    }

    return mapSellerProductsForCustomer(list);
  }
}
