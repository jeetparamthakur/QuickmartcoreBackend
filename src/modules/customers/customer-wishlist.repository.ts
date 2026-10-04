import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerWishlistItemEntity } from './entities/customer-wishlist-item.entity';

@Injectable()
export class CustomerWishlistRepository {
  constructor(
    @InjectRepository(CustomerWishlistItemEntity)
    private readonly items: Repository<CustomerWishlistItemEntity>,
  ) {}

  findByCustomerId(customerId: string) {
    return this.items.find({
      where: { customerId },
      relations: [
        'sellerProduct',
        'sellerProduct.masterProduct',
        'sellerProduct.store',
        'sellerProduct.independentSeller',
        'sellerProduct.inventory',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  findProductIdsByCustomerId(customerId: string) {
    return this.items.find({
      where: { customerId },
      select: ['sellerProductId'],
      order: { createdAt: 'DESC' },
    });
  }

  findOne(customerId: string, sellerProductId: string) {
    return this.items.findOne({
      where: { customerId, sellerProductId },
    });
  }

  add(customerId: string, sellerProductId: string) {
    return this.items.save(
      this.items.create({ customerId, sellerProductId }),
    );
  }

  async remove(customerId: string, sellerProductId: string) {
    const result = await this.items.delete({ customerId, sellerProductId });
    return (result.affected ?? 0) > 0;
  }
}
