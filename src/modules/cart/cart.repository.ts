import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartEntity } from './entities/cart.entity';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartStatus } from '../../common/enums';

@Injectable()
export class CartRepository {
  constructor(
    @InjectRepository(CartEntity)
    private readonly carts: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly items: Repository<CartItemEntity>,
  ) {}

  findActiveByCustomerId(customerId: string) {
    return this.carts.findOne({
      where: { customerId, status: CartStatus.ACTIVE },
      relations: [
        'items',
        'items.sellerProduct',
        'items.sellerProduct.store',
        'items.sellerProduct.independentSeller',
        'items.sellerProduct.inventory',
      ],
    });
  }

  createCart(customerId: string) {
    return this.carts.save(
      this.carts.create({ customerId, status: CartStatus.ACTIVE }),
    );
  }

  saveCart(cart: CartEntity) {
    return this.carts.save(cart);
  }

  findItemById(id: string) {
    return this.items.findOne({
      where: { id },
      relations: ['cart', 'sellerProduct'],
    });
  }

  saveItem(item: Partial<CartItemEntity>) {
    return this.items.save(this.items.create(item));
  }

  updateItem(
    id: string,
    data: Pick<CartItemEntity, 'quantity' | 'unitPriceSnapshot'>,
  ) {
    return this.items.update(id, data);
  }

  deleteItem(id: string) {
    return this.items.delete(id);
  }

  deleteAllItems(cartId: string) {
    return this.items.delete({ cartId });
  }
}
