import {
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartService } from '../cart/cart.service';
import { PricingEngineService } from '../pricing/pricing-engine.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from '../orders/orders.service';
import { CUSTOMERS_REPOSITORY } from '../customers/customers.repository.port';
import type { CustomersRepositoryPort } from '../customers/customers.repository.port';
import { IdempotencyKeyEntity } from '../audit-logs/entities/audit-log.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SellerType } from '../../common/enums';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly cartService: CartService,
    private readonly pricingEngine: PricingEngineService,
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService,
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepo: CustomersRepositoryPort,
    @InjectRepository(IdempotencyKeyEntity)
    private readonly idempotencyRepo: Repository<IdempotencyKeyEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async checkout(userId: string, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await this.idempotencyRepo.findOne({
        where: { key: idempotencyKey },
      });
      if (existing && existing.expiresAt > new Date()) {
        return existing.responseBody;
      }
    }

    const cart = await this.cartService.validateCartForCheckout(userId);
    const profile = await this.customersRepo.findByUserId(userId);
    if (!profile) throw new ConflictException('Customer profile not found');

    const flatItems = cart.items.flatMap((group) =>
      group.items.map((item) => ({
        sellerProductId: item.sellerProductId,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
        sellerType: group.sellerType as SellerType,
        storeId: group.storeId,
        independentSellerId: group.independentSellerId,
      })),
    );

    const pricing = await this.pricingEngine.calculateCheckout({
      items: flatItems,
    });

    const result = await this.ordersService.createOrders({
      customerId: profile.id,
      items: flatItems,
      pricing,
    });

    try {
      await this.inventoryService.reserve(
        result.parent.id,
        flatItems.map((i) => ({
          sellerProductId: i.sellerProductId,
          quantity: i.quantity,
        })),
      );
    } catch (error) {
      await this.ordersService.cancelOrder(result.parent.id, profile.id);
      throw error;
    }

    await this.cartService.markCheckoutComplete(userId);

    const response = {
      parentOrder: result.parent,
      subOrders: result.subOrders,
      pricing,
    };

    this.eventEmitter.emit('order.created', {
      parentOrderId: result.parent.id,
      customerId: profile.id,
      actorId: userId,
    });

    if (idempotencyKey) {
      await this.idempotencyRepo.save(
        this.idempotencyRepo.create({
          key: idempotencyKey,
          responseBody: response as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      );
    }

    return response;
  }
}
