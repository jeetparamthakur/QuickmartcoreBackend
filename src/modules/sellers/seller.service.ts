import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserType, SubOrderStatus, ActorType, PayoutStatus, SellerType, WalletOwnerType } from '../../common/enums';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { OrdersRepository } from '../orders/orders.service';
import { OrderStateMachineService } from '../orders/order-state-machine.service';
import { ProductsRepository } from '../products/products.repository';
import { KycService } from '../kyc/kyc.service';
import { PayoutEntity } from '../payouts/entities/payout.entity';
import { WalletService } from '../wallet/wallet.service';

const STATUS_ACTIONS: Partial<Record<SubOrderStatus, string[]>> = {
  [SubOrderStatus.PLACED]: ['ACCEPT', 'REJECT'],
  [SubOrderStatus.ACCEPTED]: ['START_PREPARING'],
  [SubOrderStatus.PREPARING]: ['SET_READY_TIME', 'MARK_READY'],
  [SubOrderStatus.READY_FOR_PICKUP]: ['MARK_READY'],
};

@Injectable()
export class SellerService {
  constructor(
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payouts: Repository<PayoutEntity>,
    private readonly ordersRepo: OrdersRepository,
    private readonly stateMachine: OrderStateMachineService,
    private readonly productsRepo: ProductsRepository,
    private readonly kycService: KycService,
    private readonly walletService: WalletService,
  ) {}

  async getProfile(userId: string, userType: UserType) {
    return this.kycService.buildPartnerResponse(userId, userType);
  }

  async getProfileLegacy(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!profile) throw new NotFoundException('Store owner profile not found');
      const stores = await this.stores.find({ where: { storeOwnerId: profile.id } });
      return { profile, stores, userType };
    }
    const profile = await this.sellerProfiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    const independent = await this.independentSellers.findOne({
      where: { sellerProfileId: profile.id },
    });
    return { profile, independent, userType };
  }

  async listOrders(userId: string, userType: UserType) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.items', 'items')
      .leftJoinAndSelect('so.store', 'store')
      .orderBy('so.created_at', 'DESC');

    if (userType === UserType.STORE_OWNER) {
      const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!owner) return [];
      const storeIds = (await this.stores.find({ where: { storeOwnerId: owner.id } })).map(
        (s) => s.id,
      );
      if (!storeIds.length) return [];
      qb.where('so.store_id IN (:...storeIds)', { storeIds });
    } else {
      const seller = await this.sellerProfiles.findOne({ where: { userId } });
      if (!seller) return [];
      const ind = await this.independentSellers.findOne({
        where: { sellerProfileId: seller.id },
      });
      if (!ind) return [];
      qb.where('so.independent_seller_id = :id', { id: ind.id });
    }

    const orders = await qb.getMany();
    return orders.map((o) => this.formatSubOrder(o));
  }

  async getOrder(userId: string, userType: UserType, orderId: string) {
    const order = await this.subOrders.findOne({
      where: { id: orderId },
      relations: ['items', 'store', 'independentSeller'],
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(userId, userType, order);
    return this.formatSubOrder(order);
  }

  async transitionOrder(
    userId: string,
    userType: UserType,
    orderId: string,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    const order = await this.subOrders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(userId, userType, order);

    const actorType =
      userType === UserType.STORE_OWNER ? ActorType.STORE_OWNER : ActorType.SELLER;

    let toStatus: SubOrderStatus;
    switch (action) {
      case 'ACCEPT':
        toStatus = SubOrderStatus.ACCEPTED;
        break;
      case 'REJECT':
        toStatus = SubOrderStatus.REJECTED;
        break;
      case 'START_PREPARING':
        toStatus = SubOrderStatus.PREPARING;
        break;
      case 'MARK_READY':
        toStatus = SubOrderStatus.READY_FOR_PICKUP;
        break;
      default:
        throw new NotFoundException('Unknown action');
    }

    this.stateMachine.assertTransition(order.status, toStatus);
    const updated = await this.ordersRepo.updateSubOrderStatus(
      orderId,
      toStatus,
      userId,
      actorType,
    );
    return this.formatSubOrder(updated!);
  }

  async listProducts(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!owner) return [];
      const store = await this.stores.findOne({ where: { storeOwnerId: owner.id } });
      if (!store) return [];
      return this.productsRepo.findByStoreId(store.id);
    }
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) return [];
    const ind = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (!ind) return [];
    return this.productsRepo.findSellerProductsPaginated(1, 100, {}).then((r) => r.data.filter(
      (p) => p.independentSellerId === ind.id,
    ));
  }

  async listStores(userId: string) {
    const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
    if (!owner) return [];
    return this.stores.find({ where: { storeOwnerId: owner.id } });
  }

  async getEarnings(userId: string, userType: UserType) {
    const scope = await this.resolveSellerScope(userId, userType);
    if (!scope) {
      return this.emptyEarningsSummary();
    }

    const startOfToday = this.startOfUtcDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 6);
    const startOfMonth = new Date(Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth(), 1));

    const [today, week, month, total] = await Promise.all([
      this.sumEarnings(scope, startOfToday),
      this.sumEarnings(scope, startOfWeek),
      this.sumEarnings(scope, startOfMonth),
      this.sumEarnings(scope),
    ]);

    const wallet = await this.walletService.getWallet(userId, WalletOwnerType.SELLER).catch(() => null);
    const availableBalance = wallet ? parseFloat(wallet.balance) : 0;

    const pendingPayouts = await this.payouts.find({
      where: {
        beneficiaryId: scope.beneficiaryId,
        beneficiaryType: scope.beneficiaryType,
        status: PayoutStatus.PENDING,
      },
    });
    const pendingSettlement = pendingPayouts.reduce(
      (sum, payout) => sum + parseFloat(payout.amount),
      0,
    );

    const nextPayout = await this.payouts.findOne({
      where: {
        beneficiaryId: scope.beneficiaryId,
        beneficiaryType: scope.beneficiaryType,
        status: PayoutStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });

    return {
      today,
      week,
      month,
      total,
      pendingSettlement,
      availableBalance,
      nextSettlement: nextPayout ? parseFloat(nextPayout.amount) : pendingSettlement,
      nextSettlementDate: this.getNextSettlementDate(),
    };
  }

  private async resolveSellerScope(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
      if (!owner) return null;
      const storeIds = (await this.stores.find({ where: { storeOwnerId: owner.id } })).map(
        (store) => store.id,
      );
      if (!storeIds.length) return null;
      return {
        storeIds,
        beneficiaryId: owner.id,
        beneficiaryType: SellerType.STORE,
      };
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) return null;
    const independent = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (!independent) return null;
    return {
      independentSellerId: independent.id,
      beneficiaryId: independent.id,
      beneficiaryType: SellerType.INDEPENDENT,
    };
  }

  private async sumEarnings(
    scope: {
      storeIds?: string[];
      independentSellerId?: string;
    },
    since?: Date,
  ) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .select(
        'COALESCE(SUM(CAST(so.subtotal AS DECIMAL) - CAST(so.commission_amount AS DECIMAL)), 0)',
        'total',
      )
      .where('so.status = :status', { status: SubOrderStatus.DELIVERED });

    if (scope.storeIds?.length) {
      qb.andWhere('so.store_id IN (:...storeIds)', { storeIds: scope.storeIds });
    } else if (scope.independentSellerId) {
      qb.andWhere('so.independent_seller_id = :id', { id: scope.independentSellerId });
    } else {
      return 0;
    }

    if (since) {
      qb.andWhere('so.created_at >= :since', { since });
    }

    const result = await qb.getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }

  private emptyEarningsSummary() {
    return {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      pendingSettlement: 0,
      availableBalance: 0,
      nextSettlement: 0,
      nextSettlementDate: this.getNextSettlementDate(),
    };
  }

  private startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private getNextSettlementDate() {
    const date = new Date();
    const daysUntilTuesday = (2 - date.getUTCDay() + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + daysUntilTuesday);
    return date.toISOString().slice(0, 10);
  }

  private async assertOrderAccess(
    userId: string,
    userType: UserType,
    order: SubOrderEntity,
  ) {
    if (userType === UserType.STORE_OWNER) {
      const owner = await this.storeOwnerProfiles.findOne({ where: { userId } });
      const store = order.storeId
        ? await this.stores.findOne({ where: { id: order.storeId } })
        : null;
      if (!owner || !store || store.storeOwnerId !== owner.id) {
        throw new NotFoundException('Order not found');
      }
      return;
    }
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    const ind = seller
      ? await this.independentSellers.findOne({ where: { sellerProfileId: seller.id } })
      : null;
    if (!ind || order.independentSellerId !== ind.id) {
      throw new NotFoundException('Order not found');
    }
  }

  private formatSubOrder(order: SubOrderEntity) {
    return {
      ...order,
      allowedActions: STATUS_ACTIONS[order.status] ?? [],
    };
  }
}
