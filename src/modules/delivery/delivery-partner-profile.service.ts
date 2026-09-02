import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryAssignmentStatus,
  DeliveryPartnerPreference,
  SubOrderStatus,
  UserType,
} from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { OrdersRepository } from '../orders/orders.service';
import { ActorType } from '../../common/enums';

@Injectable()
export class DeliveryPartnerProfileService {
  constructor(
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly profiles: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  async getByUserId(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Delivery partner profile not found');
    return profile;
  }

  async register(userId: string, data: { fullName: string; preference?: DeliveryPartnerPreference }) {
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

  async updatePreference(userId: string, preference: DeliveryPartnerPreference) {
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
    return {
      todayDeliveries: completed,
      todayEarnings: completed * 50,
      rating: 4.8,
      onlineTimeMinutes: 0,
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
    const completed = await this.assignments.count({
      where: { partnerProfileId, status: DeliveryAssignmentStatus.COMPLETED },
    });
    return {
      totalEarnings: completed * 50,
      todayEarnings: 0,
      completedDeliveries: completed,
    };
  }
}
