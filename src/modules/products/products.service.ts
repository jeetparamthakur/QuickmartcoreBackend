import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  list(page: number, limit: number, categoryId?: string, storeId?: string, q?: string) {
    return this.repo.findSellerProductsPaginated(page, limit, {
      categoryId,
      storeId,
      q,
    });
  }

  async getById(id: string) {
    const product = await this.repo.findSellerProductById(id);
    if (!product) {
      throw new NotFoundException({
        message: 'Product not found',
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }
    return product;
  }

  listByStore(storeId: string) {
    return this.repo.findByStoreId(storeId);
  }
}
