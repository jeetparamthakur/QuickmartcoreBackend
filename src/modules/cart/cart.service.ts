import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CartStatus, SellerType } from '../../common/enums';
import { CartEntity } from './entities/cart.entity';
import { CUSTOMERS_REPOSITORY } from '../customers/customers.repository.port';
import type { CustomersRepositoryPort } from '../customers/customers.repository.port';
import { ProductsRepository } from '../products/products.repository';
import { CartRepository } from './cart.repository';
import { PricingEngineService } from '../pricing/pricing-engine.service';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly productsRepo: ProductsRepository,
    private readonly pricingEngine: PricingEngineService,
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

  private async getOrCreateCart(customerId: string) {
    let cart = await this.cartRepo.findActiveByCustomerId(customerId);
    if (!cart) {
      cart = await this.cartRepo.createCart(customerId);
      cart.items = [];
    }
    return cart;
  }

  async getCart(userId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const cart = await this.getOrCreateCart(customerId);
    return this.formatCart(cart);
  }

  async addItem(userId: string, sellerProductId: string, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestException({
        message: 'Quantity must be at least 1',
        errorCode: 'INVALID_QUANTITY',
      });
    }

    const product = await this.productsRepo.findSellerProductById(sellerProductId);
    if (!product) {
      throw new NotFoundException({
        message: 'Product not found',
        errorCode: 'PRODUCT_NOT_FOUND',
      });
    }

    const available =
      (product.inventory?.quantityAvailable ?? 0) -
      (product.inventory?.quantityReserved ?? 0);
    if (available < quantity) {
      throw new BadRequestException({
        message: 'Insufficient stock',
        errorCode: 'INSUFFICIENT_STOCK',
      });
    }

    const customerId = await this.getCustomerProfileId(userId);
    const cart = await this.getOrCreateCart(customerId);
    const existing = cart.items?.find(
      (i) => i.sellerProductId === sellerProductId,
    );

    if (existing) {
      await this.cartRepo.updateItem(existing.id, {
        quantity: existing.quantity + quantity,
        unitPriceSnapshot: product.sellingPrice,
      });
    } else {
      await this.cartRepo.saveItem({
        cartId: cart.id,
        sellerProductId,
        quantity,
        unitPriceSnapshot: product.sellingPrice,
      });
    }

    return this.getCart(userId);
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const customerId = await this.getCustomerProfileId(userId);
    const item = await this.cartRepo.findItemById(itemId);
    if (!item || item.cart.customerId !== customerId) {
      throw new NotFoundException({
        message: 'Cart item not found',
        errorCode: 'CART_ITEM_NOT_FOUND',
      });
    }

    if (quantity < 1) {
      await this.cartRepo.deleteItem(itemId);
    } else {
      const product = await this.productsRepo.findSellerProductById(
        item.sellerProductId,
      );
      await this.cartRepo.updateItem(itemId, {
        quantity,
        unitPriceSnapshot: product?.sellingPrice ?? item.unitPriceSnapshot,
      });
    }

    return this.getCart(userId);
  }

  async removeItem(userId: string, itemId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const item = await this.cartRepo.findItemById(itemId);
    if (!item || item.cart.customerId !== customerId) {
      throw new NotFoundException({
        message: 'Cart item not found',
        errorCode: 'CART_ITEM_NOT_FOUND',
      });
    }
    await this.cartRepo.deleteItem(itemId);
    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const cart = await this.cartRepo.findActiveByCustomerId(customerId);
    if (cart) await this.cartRepo.deleteAllItems(cart.id);
    return this.getCart(userId);
  }

  async validateCartForCheckout(userId: string) {
    const cart = await this.getCart(userId);
    if (!cart.items.length) {
      throw new BadRequestException({
        message: 'Cart is empty',
        errorCode: 'CART_EMPTY',
      });
    }
    return cart;
  }

  async markCheckoutComplete(userId: string) {
    const customerId = await this.getCustomerProfileId(userId);
    const cart = await this.cartRepo.findActiveByCustomerId(customerId);
    if (cart) {
      cart.status = CartStatus.CHECKOUT;
      await this.cartRepo.saveCart(cart);
      await this.cartRepo.createCart(customerId);
    }
  }

  async previewCheckout(userId: string) {
    const cart = await this.validateCartForCheckout(userId);
    const flatItems = cart.items.flatMap((group) =>
      group.items.map((item) => ({
        sellerProductId: item.sellerProductId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        sellerType: group.sellerType,
        storeId: group.storeId ?? undefined,
        independentSellerId: group.independentSellerId ?? undefined,
      })),
    );
    const pricing = await this.pricingEngine.calculateCheckout({ items: flatItems });
    return { cart, pricing };
  }

  private formatCart(cart: Awaited<ReturnType<CartRepository['findActiveByCustomerId']>>) {
    const items = cart?.items ?? [];
    const groups = new Map<string, typeof items>();

    for (const item of items) {
      const sp = item.sellerProduct;
      const key =
        sp.sellerType === SellerType.STORE
          ? `store:${sp.storeId}`
          : `independent:${sp.independentSellerId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const grouped = [...groups.entries()].map(([key, groupItems]) => {
      const first = groupItems[0].sellerProduct;
      return {
        sellerType: first.sellerType,
        storeId: first.storeId,
        independentSellerId: first.independentSellerId,
        storeName: first.store?.name,
        sellerName: first.independentSeller?.businessName,
        items: groupItems.map((i) => ({
          id: i.id,
          sellerProductId: i.sellerProductId,
          title: i.sellerProduct.title,
          quantity: i.quantity,
          unitPrice: i.unitPriceSnapshot,
          lineTotal: (parseFloat(i.unitPriceSnapshot) * i.quantity).toFixed(2),
        })),
      };
    });

    const subtotal = items.reduce(
      (sum, i) => sum + parseFloat(i.unitPriceSnapshot) * i.quantity,
      0,
    );

    return {
      id: cart?.id,
      items: grouped,
      itemCount: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: subtotal.toFixed(2),
    };
  }
}
