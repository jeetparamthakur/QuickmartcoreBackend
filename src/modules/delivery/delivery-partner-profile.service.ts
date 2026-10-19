import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryAssignmentStatus,
  DeliveryPartnerPreference,
  SubOrderStatus,
} from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { OrdersRepository } from '../orders/orders.service';
import { ActorType } from '../../common/enums';
import { PartnerShiftService } from './partner-shift.service';

@Injectable()
export class DeliveryPartnerProfileService {
  constructor(
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly profiles: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly ordersRepo: OrdersRepository,
    private readonly shiftService: PartnerShiftService,
  ) {}

  async getByUserId(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile)
      throw new NotFoundException('Delivery partner profile not found');
    return profile;
  }

  async register(
    userId: string,
    data: { fullName: string; preference?: DeliveryPartnerPreference },
  ) {
    let profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      profile = await this.profiles.save(
        this.profiles.create({
          userId,
          fullName: data.fullName,
          preference: data.preference ?? DeliveryPartnerPreference.BOTH,
          isOnline: false,
        }),
      );
    } else {
      profile.fullName = data.fullName;
      if (data.preference) profile.preference = data.preference;
      await this.profiles.save(profile);
    }
    return profile;
  }

  async updatePreference(
    userId: string,
    preference: DeliveryPartnerPreference,
  ) {
    const profile = await this.getByUserId(userId);
    profile.preference = preference;
    return this.profiles.save(profile);
  }

  async getDashboard(userId: string) {
    const profile = await this.getByUserId(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completed = await this.assignments.count({
      where: {
        partnerProfileId: profile.id,
        status: DeliveryAssignmentStatus.COMPLETED,
      },
    });
    const onlineTimeMinutes = await this.shiftService.getTodayOnlineMinutes(
      profile.id,
    );
    return {
      todayDeliveries: completed,
      todayEarnings: completed * 50,
      rating: 4.8,
      onlineTimeMinutes,
      isOnline: profile.isOnline,
      preference: profile.preference,
    };
  }

  async listActive(partnerProfileId: string) {
    return this.assignments.find({
      where: {
        partnerProfileId,
        status: DeliveryAssignmentStatus.ACCEPTED,
      },
      relations: ['subOrder'],
    });
  }

  async confirmPickup(assignmentId: string, partnerProfileId: string) {
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId, partnerProfileId },
      relations: ['subOrder'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.ordersRepo.updateSubOrderStatus(
      assignment.subOrderId,
      SubOrderStatus.PICKED_UP,
      partnerProfileId,
      ActorType.DELIVERY_PARTNER,
    );
    await this.assignments.update(assignmentId, {
      status: DeliveryAssignmentStatus.IN_PROGRESS,
    });
    return this.assignments.findOne({
      where: { id: assignmentId },
      relations: ['subOrder'],
    });
  }

  async markOutForDelivery(assignmentId: string, partnerProfileId: string) {
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId, partnerProfileId },
      relations: ['subOrder'],
    });
    if (!assignment?.subOrder) return null;
    if (assignment.subOrder.status !== SubOrderStatus.PICKED_UP) {
      return assignment;
    }
    await this.ordersRepo.updateSubOrderStatus(
      assignment.subOrderId,
      SubOrderStatus.OUT_FOR_DELIVERY,
      partnerProfileId,
      ActorType.DELIVERY_PARTNER,
    );
    return this.assignments.findOne({
      where: { id: assignmentId },
      relations: ['subOrder'],
    });
  }

  async confirmDelivery(assignmentId: string, partnerProfileId: string) {
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId, partnerProfileId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.ordersRepo.updateSubOrderStatus(
      assignment.subOrderId,
      SubOrderStatus.DELIVERED,
      partnerProfileId,
      ActorType.DELIVERY_PARTNER,
    );
    await this.assignments.update(assignmentId, {
      status: DeliveryAssignmentStatus.COMPLETED,
    });
    return { success: true };
  }

  async getEarnings(partnerProfileId: string) {
    const startOfToday = this.startOfUtcDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 6);
    const startOfMonth = new Date(
      Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth(), 1),
    );

    const [today, week, month, total, completed] = await Promise.all([
      this.sumPartnerEarnings(partnerProfileId, startOfToday),
      this.sumPartnerEarnings(partnerProfileId, startOfWeek),
      this.sumPartnerEarnings(partnerProfileId, startOfMonth),
      this.sumPartnerEarnings(partnerProfileId),
      this.assignments.count({
        where: {
          partnerProfileId,
          status: DeliveryAssignmentStatus.COMPLETED,
        },
      }),
    ]);

    return {
      todayEarnings: today,
      weekEarnings: week,
      monthEarnings: month,
      totalEarnings: total,
      completedDeliveries: completed,
    };
  }

  private async sumPartnerEarnings(
    partnerProfileId: string,
    since?: Date,
  ): Promise<number> {
    const qb = this.assignments
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.partner_earning), 0)', 'sum')
      .where('a.partner_profile_id = :partnerProfileId', { partnerProfileId })
      .andWhere('a.status = :status', {
        status: DeliveryAssignmentStatus.COMPLETED,
      });

    if (since) {
      qb.andWhere('a.updated_at >= :since', { since });
    }

    const row = await qb.getRawOne<{ sum: string }>();
    return parseFloat(row?.sum ?? '0');
  }

  private startOfUtcDay(date = new Date()) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
}
