import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { CustomerProfileEntity } from '../customers/entities/customer-profile.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { StoreStatus } from '../../common/enums';
import { Inject } from '@nestjs/common';
import { ACCESS_CONTROL_REPOSITORY } from '../access-control/access-control.repository';
import type { AccessControlRepositoryPort } from '../access-control/access-control.repository';

@Injectable()
export class AdminCrudService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(StoreEntity) private readonly stores: Repository<StoreEntity>,
    @InjectRepository(CustomerProfileEntity)
    private readonly customers: Repository<CustomerProfileEntity>,
    @InjectRepository(ParentOrderEntity) private readonly orders: Repository<ParentOrderEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly partners: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly sellers: Repository<IndependentSellerEntity>,
    @Inject(ACCESS_CONTROL_REPOSITORY)
    private readonly accessControl: AccessControlRepositoryPort,
  ) {}

  listStores() {
    return this.stores.find({ relations: ['storeOwner'], order: { createdAt: 'DESC' } });
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
    return this.orders.findOne({ where: { id }, relations: ['subOrders', 'subOrders.items'] });
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
}
