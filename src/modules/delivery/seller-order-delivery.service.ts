import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ApprovalStatus,
  DeliveryAssignmentStatus,
  SubOrderStatus,
} from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryPartnerPushService } from './delivery-partner-push.service';
import { subOrderMatchesPartner } from './delivery-partner-matching.util';

const ACTIVE_ASSIGNMENT_STATUSES = [
  DeliveryAssignmentStatus.PENDING,
  DeliveryAssignmentStatus.ACCEPTED,
  DeliveryAssignmentStatus.IN_PROGRESS,
];

export type SellerOrderDeliveryFields = {
  deliveryType: 'platform' | 'pickup' | 'self';
  deliveryRequestStatus:
    | 'none'
    | 'requested'
    | 'accepted'
    | 'rejected'
    | 'picked_up'
    | 'delivered';
  deliveryRequestedAt?: string;
  assignedPartnerId?: string;
  assignedPartnerName?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
};

@Injectable()
export class SellerOrderDeliveryService {
  constructor(
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly partnerProfiles: Repository<DeliveryPartnerProfileEntity>,
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly partnerPush: DeliveryPartnerPushService,
  ) {}

  async requestDelivery(subOrderId: string): Promise<SellerOrderDeliveryFields> {
    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
      relations: ['store', 'independentSeller'],
    });
    if (!subOrder) {
      throw new NotFoundException('Order not found');
    }

    if (subOrder.status !== SubOrderStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        'Order must be ready before requesting delivery',
      );
    }

    if (parseFloat(subOrder.deliveryFee ?? '0') <= 0) {
      throw new BadRequestException(
        'Delivery requests are only for platform delivery orders',
      );
    }

    if (subOrder.storeId && subOrder.store) {
      const details = (subOrder.store.details ?? {}) as Record<string, unknown>;
      if (details.platformDeliveryEnabled === false) {
        throw new BadRequestException(
          'Platform delivery is disabled for this store',
        );
      }
    }

    const active = await this.assignments.find({
      where: {
        subOrderId,
        status: In([
          DeliveryAssignmentStatus.ACCEPTED,
          DeliveryAssignmentStatus.IN_PROGRESS,
        ]),
      },
    });
    if (active.length > 0) {
      throw new BadRequestException('Delivery request already active');
    }

    const pending = await this.assignments.count({
      where: {
        subOrderId,
        status: DeliveryAssignmentStatus.PENDING,
      },
    });
    if (pending > 0) {
      return this.getDeliveryFields(subOrderId, subOrder);
    }

    const partners = await this.partnerProfiles.find({
      where: {
        isOnline: true,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    const eligible = partners.filter((profile) =>
      subOrderMatchesPartner(subOrder, profile),
    );

    for (const profile of eligible) {
      const assignment = await this.assignmentService.assign(
        subOrderId,
        profile.id,
      );
      if (assignment) {
        void this.partnerPush
          .notifyPartnerAssignment(profile.id, subOrderId, assignment.id)
          .catch(() => undefined);
      }
    }

    void this.partnerPush.notifyPickupAvailable(subOrderId).catch(() => undefined);

    return this.getDeliveryFields(subOrderId, subOrder);
  }

  async cancelDeliveryRequest(
    subOrderId: string,
  ): Promise<SellerOrderDeliveryFields> {
    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
      relations: ['store', 'independentSeller'],
    });
    if (!subOrder) {
      throw new NotFoundException('Order not found');
    }

    const pending = await this.assignments.find({
      where: {
        subOrderId,
        status: DeliveryAssignmentStatus.PENDING,
      },
    });
    if (!pending.length) {
      throw new BadRequestException(
        'Only pending delivery requests can be cancelled',
      );
    }

    await this.assignments.update(
      { subOrderId, status: DeliveryAssignmentStatus.PENDING },
      { status: DeliveryAssignmentStatus.REJECTED },
    );

    return this.getDeliveryFields(subOrderId, subOrder);
  }

  async getDeliveryFields(
    subOrderId: string,
    subOrderHint?: SubOrderEntity | null,
  ): Promise<SellerOrderDeliveryFields> {
    const subOrder =
      subOrderHint ??
      (await this.subOrders.findOne({
        where: { id: subOrderId },
        relations: ['store', 'independentSeller'],
      }));

    const deliveryType =
      subOrder && parseFloat(subOrder.deliveryFee ?? '0') > 0
        ? 'platform'
        : 'pickup';

    const rows = await this.assignments.find({
      where: { subOrderId },
      relations: ['partnerProfile'],
      order: { assignedAt: 'DESC', createdAt: 'DESC' },
    });

    const pickup = this.resolvePickupLocation(subOrder);

    if (!rows.length) {
      return {
        deliveryType,
        deliveryRequestStatus: 'none',
        ...pickup,
      };
    }

    const accepted = rows.find(
      (row) =>
        row.status === DeliveryAssignmentStatus.ACCEPTED ||
        row.status === DeliveryAssignmentStatus.IN_PROGRESS,
    );
    const hasPending = rows.some(
      (row) => row.status === DeliveryAssignmentStatus.PENDING,
    );
    const latestPending = rows.find(
      (row) => row.status === DeliveryAssignmentStatus.PENDING,
    );

    let deliveryRequestStatus: SellerOrderDeliveryFields['deliveryRequestStatus'] =
      'none';

    if (subOrder?.status === SubOrderStatus.DELIVERED) {
      deliveryRequestStatus = 'delivered';
    } else if (
      subOrder?.status === SubOrderStatus.PICKED_UP ||
      subOrder?.status === SubOrderStatus.OUT_FOR_DELIVERY
    ) {
      deliveryRequestStatus = 'picked_up';
    } else if (accepted) {
      deliveryRequestStatus = 'accepted';
    } else if (hasPending) {
      deliveryRequestStatus = 'requested';
    } else if (
      rows.every(
        (row) =>
          row.status === DeliveryAssignmentStatus.REJECTED ||
          row.status === DeliveryAssignmentStatus.TIMEOUT,
      )
    ) {
      deliveryRequestStatus = 'rejected';
    }

    const partner = accepted?.partnerProfile ?? latestPending?.partnerProfile;

    const requestedAt = rows
      .map((row) => row.assignedAt ?? row.createdAt)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0];

    return {
      deliveryType,
      deliveryRequestStatus,
      deliveryRequestedAt: requestedAt?.toISOString(),
      assignedPartnerId: partner?.id,
      assignedPartnerName: partner?.fullName,
      ...pickup,
    };
  }

  private resolvePickupLocation(subOrder?: SubOrderEntity | null) {
    if (!subOrder) return {};
    if (subOrder.store) {
      const details = (subOrder.store.details ?? {}) as Record<string, unknown>;
      const lat =
        subOrder.store.lat != null
          ? parseFloat(subOrder.store.lat)
          : typeof details.latitude === 'number'
            ? details.latitude
            : undefined;
      const lng =
        subOrder.store.lng != null
          ? parseFloat(subOrder.store.lng)
          : typeof details.longitude === 'number'
            ? details.longitude
            : undefined;
      return {
        pickupLatitude: Number.isFinite(lat) ? lat : undefined,
        pickupLongitude: Number.isFinite(lng) ? lng : undefined,
      };
    }
    return {};
  }
}
