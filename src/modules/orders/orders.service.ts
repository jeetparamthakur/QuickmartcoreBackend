import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ParentOrderEntity } from './entities/parent-order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderStatusHistoryEntity } from './entities/order-status-history.entity';
import {
  ActorType,
  CouponFundingSource,
  ParentOrderStatus,
  PaymentStatus,
  SellerType,
  SubOrderStatus,
} from '../../common/enums';
import { OrderStateMachineService } from './order-state-machine.service';
import { PricingBreakdown } from '../pricing/pricing-engine.service';
import { CommissionEngineService } from '../commission/commission-engine.service';
import { CouponEngineService } from '../coupons/coupon-engine.service';

export interface CreateOrderInput {
  customerId: string;
  items: Array<{
    sellerProductId: string;
    quantity: number;
    unitPrice: number;
    sellerType: SellerType;
    storeId?: string | null;
    independentSellerId?: string | null;
  }>;
  pricing: PricingBreakdown;
}

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(ParentOrderEntity)
    private readonly parentOrders: Repository<ParentOrderEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly commissionEngine: CommissionEngineService,
    private readonly couponEngine: CouponEngineService,
  ) {}

  private orderCounter = 10000;

  private nextOrderNumber(suffix = '') {
    this.orderCounter += 1;
    return suffix
      ? `${this.orderCounter}-${suffix}`
      : String(this.orderCounter);
  }

  async createParentAndSubOrders(input: CreateOrderInput) {
    return this.dataSource.transaction(async (manager) => {
      const parentNumber = this.nextOrderNumber();
      const parent = await manager.save(
        manager.create(ParentOrderEntity, {
          customerId: input.customerId,
          orderNumber: parentNumber,
          status: ParentOrderStatus.PLACED,
          subtotal: input.pricing.subtotal.toFixed(2),
          discountTotal: input.pricing.discountTotal.toFixed(2),
          deliveryFee: input.pricing.deliveryFee.toFixed(2),
          taxTotal: input.pricing.taxTotal.toFixed(2),
          platformFee: input.pricing.platformFee.toFixed(2),
          chargeBreakdown: input.pricing.charges.map((charge) => ({
            code: charge.code,
            name: charge.name,
            type: charge.type,
            amount: charge.amount,
          })),
          totalPayable: input.pricing.totalPayable.toFixed(2),
          paymentStatus: PaymentStatus.PENDING,
          couponId: input.pricing.couponId ?? null,
          couponCode: input.pricing.couponCode ?? null,
        }),
      );

      const groupMap = new Map<string, typeof input.items>();
      for (const item of input.items) {
        const key =
          item.sellerType === SellerType.STORE
            ? `store:${item.storeId}`
            : `independent:${item.independentSellerId}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(item);
      }

      let idx = 1;
      const subOrders: SubOrderEntity[] = [];

      for (const [, groupItems] of groupMap) {
        const first = groupItems[0];
        const groupPricing = input.pricing.sellerGroups.find(
          (g) =>
            g.sellerType === first.sellerType &&
            g.storeId === first.storeId &&
            g.independentSellerId === first.independentSellerId,
        );

        const subtotal = groupItems.reduce(
          (s, i) => s + i.unitPrice * i.quantity,
          0,
        );

        const targetId =
          first.sellerType === SellerType.STORE
            ? (first.storeId ?? undefined)
            : (first.independentSellerId ?? undefined);

        const groupDiscount = groupPricing?.discountTotal ?? 0;
        const commissionBase =
          input.pricing.fundingSource === CouponFundingSource.SELLER
            ? Math.max(subtotal - groupDiscount, 0)
            : subtotal;

        const commissionAmount =
          await this.commissionEngine.calculateCommission({
            sellerType: first.sellerType,
            orderAmount: commissionBase,
            targetId,
          });

        const subOrder = await manager.save(
          manager.create(SubOrderEntity, {
            parentOrderId: parent.id,
            sellerType: first.sellerType,
            storeId: first.storeId,
            independentSellerId: first.independentSellerId,
            orderNumber: `${parentNumber}-${idx}`,
            status: SubOrderStatus.PLACED,
            subtotal: subtotal.toFixed(2),
            discountTotal: groupDiscount.toFixed(2),
            deliveryFee: (groupPricing?.deliveryFee ?? 0).toFixed(2),
            commissionAmount: commissionAmount.toFixed(2),
          }),
        );

        for (const item of groupItems) {
          await manager.save(
            manager.create(OrderItemEntity, {
              subOrderId: subOrder.id,
              sellerProductId: item.sellerProductId,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toFixed(2),
              lineTotal: (item.unitPrice * item.quantity).toFixed(2),
            }),
          );
        }

        await manager.save(
          manager.create(OrderStatusHistoryEntity, {
            subOrderId: subOrder.id,
            fromStatus: null,
            toStatus: SubOrderStatus.PLACED,
            actorType: ActorType.CUSTOMER,
            metadata: {},
          }),
        );

        subOrders.push(subOrder);
        idx += 1;
      }

      if (input.pricing.couponId && input.pricing.discountTotal > 0) {
        await this.couponEngine.recordRedemption(
          input.pricing.couponId,
          input.customerId,
          parent.id,
          input.pricing.discountTotal,
        );
      }

      return { parent, subOrders };
    });
  }

  findParentOrdersByCustomer(customerId: string) {
    return this.parentOrders.find({
      where: { customerId },
      relations: ['subOrders', 'subOrders.items'],
      order: { createdAt: 'DESC' },
    });
  }

  findParentOrderById(id: string, customerId?: string) {
    return this.parentOrders.findOne({
      where: customerId ? { id, customerId } : { id },
      relations: ['subOrders', 'subOrders.items', 'subOrders.statusHistory'],
    });
  }

  findSubOrderById(id: string) {
    return this.subOrders.findOne({
      where: { id },
      relations: ['parentOrder'],
    });
  }

  async updateSubOrderStatus(
    subOrderId: string,
    toStatus: SubOrderStatus,
    actorId: string | null,
    actorType: ActorType,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const subOrder = await manager.findOne(SubOrderEntity, {
        where: { id: subOrderId },
        relations: ['parentOrder'],
      });
      if (!subOrder) return null;

      const fromStatus = subOrder.status;
      subOrder.status = toStatus;
      await manager.save(subOrder);

      await manager.save(
        manager.create(OrderStatusHistoryEntity, {
          subOrderId,
          fromStatus,
          toStatus,
          actorId,
          actorType,
          metadata: {},
        }),
      );

      const siblings = await manager.find(SubOrderEntity, {
        where: { parentOrderId: subOrder.parentOrderId },
      });
      const parent = subOrder.parentOrder;
      parent.status = new OrderStateMachineService().mapParentStatus(
        siblings.map((s) => s.status),
      );
      await manager.save(parent);

      return subOrder;
    });
  }
}

import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly stateMachine: OrderStateMachineService,
    private readonly inventoryService: InventoryService,
  ) {}

  createOrders(input: CreateOrderInput) {
    return this.repo.createParentAndSubOrders(input);
  }

  listCustomerOrders(customerId: string) {
    return this.repo.findParentOrdersByCustomer(customerId);
  }

  async getCustomerOrder(id: string, customerId: string) {
    const order = await this.repo.findParentOrderById(id, customerId);
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }
    return order;
  }

  async cancelOrder(parentOrderId: string, customerId: string) {
    const order = await this.getCustomerOrder(parentOrderId, customerId);
    for (const sub of order.subOrders ?? []) {
      if (this.stateMachine.canCancel(sub.status)) {
        this.stateMachine.assertTransition(
          sub.status,
          SubOrderStatus.CANCELLED,
        );
        await this.repo.updateSubOrderStatus(
          sub.id,
          SubOrderStatus.CANCELLED,
          customerId,
          ActorType.CUSTOMER,
        );
      }
    }
    await this.inventoryService.release(parentOrderId);
    return this.getCustomerOrder(parentOrderId, customerId);
  }
}
