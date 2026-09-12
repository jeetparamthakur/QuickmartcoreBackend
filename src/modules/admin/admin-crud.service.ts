import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { CustomerProfileEntity } from '../customers/entities/customer-profile.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import {
  LedgerEntryType,
  PartnerType,
  PaymentStatus,
  StoreStatus,
} from '../../common/enums';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { LedgerEntryEntity } from '../finance/entities/ledger-entry.entity';
import { Inject } from '@nestjs/common';
import { ACCESS_CONTROL_REPOSITORY } from '../access-control/access-control.repository';
import type { AccessControlRepositoryPort } from '../access-control/access-control.repository';

@Injectable()
export class AdminCrudService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customers: Repository<CustomerProfileEntity>,
    @InjectRepository(ParentOrderEntity)
    private readonly orders: Repository<ParentOrderEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(LedgerEntryEntity)
    private readonly ledger: Repository<LedgerEntryEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly partners: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly sellers: Repository<IndependentSellerEntity>,
    @Inject(ACCESS_CONTROL_REPOSITORY)
    private readonly accessControl: AccessControlRepositoryPort,
  ) {}

  listStores() {
    return this.stores.find({
      relations: ['storeOwner', 'storeOwner.user'],
      order: { createdAt: 'DESC' },
    });
  }

  listRestaurants() {
    return this.stores
      .createQueryBuilder('store')
      .innerJoinAndSelect('store.storeOwner', 'owner')
      .leftJoinAndSelect('owner.user', 'user')
      .where('owner.partnerType = :partnerType', {
        partnerType: PartnerType.FOOD_STORE,
      })
      .orderBy('store.createdAt', 'DESC')
      .getMany();
  }

  async updateStoreStatus(id: string, status: StoreStatus) {
    await this.stores.update(id, { status });
    return this.stores.findOne({ where: { id } });
  }

  listCustomers() {
    return this.customers.find({ order: { createdAt: 'DESC' } });
  }

  listOrders() {
    return this.orders.find({
      relations: ['subOrders'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  getOrder(id: string) {
    return this.orders.findOne({
      where: { id },
      relations: ['subOrders', 'subOrders.items'],
    });
  }

  listSellers() {
    return this.sellers.find({ order: { createdAt: 'DESC' } });
  }

  listDeliveryPartners() {
    return this.partners.find({ order: { createdAt: 'DESC' } });
  }

  getEffectivePermissions(userId: string) {
    return this.accessControl.getPermissionsForUser(userId);
  }

  async getFinanceSummary() {
    const paidOrders = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.platform_fee), 0)', 'platformRevenue')
      .addSelect('COALESCE(SUM(o.delivery_fee), 0)', 'deliveryRevenue')
      .where('o.payment_status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne<{ platformRevenue: string; deliveryRevenue: string }>();

    const commissionRow = await this.subOrders
      .createQueryBuilder('s')
      .innerJoin('s.parentOrder', 'o')
      .select('COALESCE(SUM(s.commission_amount), 0)', 'commission')
      .where('o.payment_status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne<{ commission: string }>();

    const pendingPayments = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total_payable), 0)', 'pending')
      .where('o.payment_status = :status', { status: PaymentStatus.PENDING })
      .getRawOne<{ pending: string }>();

    const refunds = await this.ledger
      .createQueryBuilder('l')
      .select('COALESCE(SUM(l.amount), 0)', 'refunds')
      .where('l.type = :type', { type: LedgerEntryType.REFUND })
      .getRawOne<{ refunds: string }>();

    const platformRevenue = parseFloat(paidOrders?.platformRevenue ?? '0');
    const deliveryRevenue = parseFloat(paidOrders?.deliveryRevenue ?? '0');
    const commission = parseFloat(commissionRow?.commission ?? '0');

    return {
      platformRevenue,
      commission,
      chargeCollection: platformRevenue + deliveryRevenue,
      sellerPayables: 0,
      deliveryPartnerPayables: 0,
      pendingPayments: parseFloat(pendingPayments?.pending ?? '0'),
      refunds: parseFloat(refunds?.refunds ?? '0'),
    };
  }
}
