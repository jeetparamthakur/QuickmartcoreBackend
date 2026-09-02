import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { UserStatus, StoreStatus, IndependentSellerStatus } from '../../common/enums';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly deliveryPartners: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(ParentOrderEntity)
    private readonly orders: Repository<ParentOrderEntity>,
  ) {}

  async getOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, newTodayUsers] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { status: UserStatus.ACTIVE } }),
      this.users
        .createQueryBuilder('u')
        .where('u.created_at >= :today', { today })
        .getCount(),
    ]);

    const [totalStores, activeStores, inactiveStores, suspendedStores] =
      await Promise.all([
        this.stores.count(),
        this.stores.count({ where: { status: StoreStatus.ACTIVE } }),
        this.stores.count({ where: { status: StoreStatus.INACTIVE } }),
        this.stores.count({ where: { status: StoreStatus.SUSPENDED } }),
      ]);

    const [totalSellers, activeSellers, pendingSellers] = await Promise.all([
      this.independentSellers.count(),
      this.independentSellers.count({
        where: { status: IndependentSellerStatus.ACTIVE },
      }),
      this.independentSellers.count({
        where: { status: IndependentSellerStatus.PENDING },
      }),
    ]);

    const totalPartners = await this.deliveryPartners.count();
    const ordersToday = await this.orders
      .createQueryBuilder('o')
      .where('o.created_at >= :today', { today })
      .getCount();

    const allOrders = await this.orders.find();
    const totalGmv = allOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalPayable),
      0,
    );
    const todayOrders = allOrders.filter((o) => o.createdAt >= today);
    const todayGmv = todayOrders.reduce(
      (sum, o) => sum + parseFloat(o.totalPayable),
      0,
    );

    return {
      users: { total: totalUsers, active: activeUsers, newToday: newTodayUsers },
      stores: {
        total: totalStores,
        active: activeStores,
        inactive: inactiveStores,
        suspended: suspendedStores,
      },
      independentSellers: {
        total: totalSellers,
        active: activeSellers,
        pendingVerification: pendingSellers,
      },
      delivery: {
        totalPartners,
        onlinePartners: 0,
        activeDeliveries: 0,
      },
      orders: {
        today: ordersToday,
        active: allOrders.length,
        delivered: 0,
        cancelled: 0,
      },
      finance: {
        todayGmv,
        totalGmv,
        platformRevenue: totalGmv * 0.05,
        sellerPayables: totalGmv * 0.8,
        deliveryPartnerPayables: totalGmv * 0.1,
      },
    };
  }
}
