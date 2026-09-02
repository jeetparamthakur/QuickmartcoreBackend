import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParentOrderEntity } from '../orders/entities/parent-order.entity';
import { UserEntity } from '../users/entities/user.entity';
import { PaymentEntity } from '../payments/entities/payment.entity';

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

export interface UserAnalytics {
  totalUsers: number;
  usersByType: Record<string, number>;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ParentOrderEntity)
    private readonly orders: Repository<ParentOrderEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
  ) {}

  async getOrderAnalytics(): Promise<OrderAnalytics> {
    const totalOrders = await this.orders.count();
    const result = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total_payable), 0)', 'total')
      .getRawOne<{ total: string }>();

    const totalRevenue = parseFloat(result?.total ?? '0');
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, totalRevenue, averageOrderValue };
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    const totalUsers = await this.users.count();
    const rows = await this.users
      .createQueryBuilder('u')
      .select('u.user_type', 'userType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('u.user_type')
      .getRawMany<{ userType: string; count: string }>();

    const usersByType: Record<string, number> = {};
    for (const row of rows) {
      usersByType[row.userType] = parseInt(row.count, 10);
    }

    return { totalUsers, usersByType };
  }

  async getPaymentAnalytics() {
    const totalPayments = await this.payments.count();
    const result = await this.payments
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.status = :status', { status: 'SUCCESS' })
      .getRawOne<{ total: string }>();

    return {
      totalPayments,
      totalCollected: parseFloat(result?.total ?? '0'),
    };
  }

  async getDashboardSummary() {
    const [orders, users, payments] = await Promise.all([
      this.getOrderAnalytics(),
      this.getUserAnalytics(),
      this.getPaymentAnalytics(),
    ]);

    return { orders, users, payments };
  }
}
