import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from './customers.repository.port';
import type { CustomersRepositoryPort } from './customers.repository.port';
import { ProductsService } from '../products/products.service';
import { CustomerWishlistRepository } from './customer-wishlist.repository';
import { mapSellerProductForCustomer } from '../products/products-customer.mapper';

@Injectable()
export class CustomerWishlistService {
  constructor(
    private readonly wishlistRepo: CustomerWishlistRepository,
    private readonly productsService: ProductsService,
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepo: CustomersRepositoryPort,
  ) {}

  private async getCustomerProfileId(userId: string) {
    const profile = await this.customersRepo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException({
        message: 'Customer profile not found',
        errorCode: 'CUSTOMER_NOT_FOUND',
      });
    }
    return profile.id;
  }

  async list(userId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const rows = await this.wishlistRepo.findByCustomerId(customerId);
    const items = rows
      .filter((row) => row.sellerProduct)
      .map((row) => mapSellerProductForCustomer(row.sellerProduct));
    return { items };
  }

  async listIds(userId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const rows = await this.wishlistRepo.findProductIdsByCustomerId(customerId);
    return { productIds: rows.map((r) => r.sellerProductId) };
  }

  async add(userId: string, sellerProductId: string) {
    await this.productsService.getById(sellerProductId);
    const customerId = await this.getCustomerProfileId(userId);
    const existing = await this.wishlistRepo.findOne(customerId, sellerProductId);
    if (!existing) {
      await this.wishlistRepo.add(customerId, sellerProductId);
    }
    return { added: true };
  }

  async remove(userId: string, sellerProductId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const removed = await this.wishlistRepo.remove(customerId, sellerProductId);
    if (!removed) {
      throw new NotFoundException({
        message: 'Wishlist item not found',
        errorCode: 'WISHLIST_ITEM_NOT_FOUND',
      });
    }
    return { removed: true };
  }
}
