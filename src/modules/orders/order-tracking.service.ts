import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  DeliveryAssignmentStatus,
  ParentOrderStatus,
  SubOrderStatus,
} from '../../common/enums';
import { CustomerAddressEntity } from '../customers/entities/customer-address.entity';
import { DeliveryAssignmentEntity } from '../delivery/entities/delivery-assignment.entity';
import { OrdersRepository } from './orders.service';

const TRACKING_STAGE_KEYS = [
  'placed',
  'preparing',
  'ready',
  'partner_assigned',
  'picked_up',
  'on_the_way',
  'delivered',
] as const;

type TrackingStageKey = (typeof TRACKING_STAGE_KEYS)[number];

const SUB_STATUS_LABELS: Record<string, string> = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  DELIVERY_ASSIGNED: 'Delivery assigned',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
};

const STAGE_LABELS: Record<TrackingStageKey, string> = {
  placed: 'Order placed',
  preparing: 'Store preparing',
  ready: 'Ready for pickup',
  partner_assigned: 'Delivery partner assigned',
  picked_up: 'Picked up',
  on_the_way: 'On the way',
  delivered: 'Delivered',
};

function subStatusToStageKey(status: SubOrderStatus): TrackingStageKey {
  switch (status) {
    case SubOrderStatus.PLACED:
      return 'placed';
    case SubOrderStatus.ACCEPTED:
    case SubOrderStatus.PREPARING:
      return 'preparing';
    case SubOrderStatus.READY_FOR_PICKUP:
      return 'ready';
    case SubOrderStatus.DELIVERY_ASSIGNED:
      return 'partner_assigned';
    case SubOrderStatus.PICKED_UP:
      return 'picked_up';
    case SubOrderStatus.OUT_FOR_DELIVERY:
      return 'on_the_way';
    case SubOrderStatus.DELIVERED:
      return 'delivered';
    default:
      return 'placed';
  }
}

function stageIndex(key: TrackingStageKey): number {
  return TRACKING_STAGE_KEYS.indexOf(key);
}

function buildSteps(currentKey: TrackingStageKey) {
  const currentIdx = stageIndex(currentKey);
  return TRACKING_STAGE_KEYS.map((key, idx) => ({
    key,
    label: STAGE_LABELS[key],
    done: idx < currentIdx || (key === 'delivered' && currentKey === 'delivered'),
    active: idx === currentIdx,
  }));
}

function firstNameOnly(fullName: string): string {
  const trimmed = fullName?.trim() ?? '';
  if (!trimmed) return 'Delivery partner';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function isTerminalParent(status: ParentOrderStatus): boolean {
  return (
    status === ParentOrderStatus.COMPLETED ||
    status === ParentOrderStatus.CANCELLED
  );
}

function isTerminalSub(status: SubOrderStatus): boolean {
  return (
    status === SubOrderStatus.DELIVERED ||
    status === SubOrderStatus.CANCELLED ||
    status === SubOrderStatus.REJECTED ||
    status === SubOrderStatus.REFUNDED
  );
}

@Injectable()
export class OrderTrackingService {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    @InjectRepository(CustomerAddressEntity)
    private readonly customerAddresses: Repository<CustomerAddressEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
  ) {}

  async getCustomerOrderTracking(parentOrderId: string, customerId: string) {
    const order = await this.ordersRepo.findParentOrderById(
      parentOrderId,
      customerId,
    );
    if (!order) {
      throw new NotFoundException({
        message: 'Order not found',
        errorCode: 'ORDER_NOT_FOUND',
      });
    }

    const deliveryAddress = await this.resolveDeliveryAddress(customerId);
    const subOrderIds = (order.subOrders ?? []).map((s) => s.id);
    const assignmentMap = await this.loadAssignmentsBySubOrder(subOrderIds);

    const subOrderDtos = (order.subOrders ?? []).map((sub) => {
      const store = sub.store;
      const ind = sub.independentSeller;
      const storeName = store?.name ?? ind?.businessName ?? 'Store order';
      const pickupLat = Number(
        store?.lat ?? ind?.pickupLat ?? 28.6139,
      );
      const pickupLng = Number(
        store?.lng ?? ind?.pickupLng ?? 77.209,
      );
      const pickupAddress = store?.address ?? 'Pickup location';

      const assignment = assignmentMap.get(sub.id);
      let partner: {
        displayName: string;
        lat: number;
        lng: number;
        lastUpdatedAt: string | null;
      } | undefined;

      if (assignment?.partnerProfile) {
        const profile = assignment.partnerProfile;
        const lat = Number(profile.currentLat);
        const lng = Number(profile.currentLng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          partner = {
            displayName: firstNameOnly(profile.fullName),
            lat,
            lng,
            lastUpdatedAt: profile.updatedAt?.toISOString() ?? null,
          };
        } else {
          partner = {
            displayName: firstNameOnly(profile.fullName),
            lat: pickupLat,
            lng: pickupLng,
            lastUpdatedAt: profile.updatedAt?.toISOString() ?? null,
          };
        }
      }

      const status = sub.status as SubOrderStatus;
      return {
        id: sub.id,
        storeName,
        status,
        statusLabel: SUB_STATUS_LABELS[status] ?? status,
        pickup: {
          lat: pickupLat,
          lng: pickupLng,
          addressLine: pickupAddress,
        },
        partner,
        assignmentStatus: assignment?.status ?? undefined,
      };
    });

    const activeSubs = (order.subOrders ?? []).filter(
      (s) => !isTerminalSub(s.status as SubOrderStatus),
    );
    const progressSubs = activeSubs.length
      ? activeSubs
      : (order.subOrders ?? []);

    let primaryStage: TrackingStageKey = 'placed';
    let minIdx = stageIndex('delivered');
    for (const sub of progressSubs) {
      const key = subStatusToStageKey(sub.status as SubOrderStatus);
      const idx = stageIndex(key);
      if (idx < minIdx) {
        minIdx = idx;
        primaryStage = key;
      }
    }

    if (isTerminalParent(order.status)) {
      primaryStage = 'delivered';
    }

    const customerLat = Number(deliveryAddress?.lat ?? 28.6139);
    const customerLng = Number(deliveryAddress?.lng ?? 77.209);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      parentStatus: order.status,
      isTerminal: isTerminalParent(order.status),
      etaMinutes: this.estimateEtaMinutes(order.subOrders ?? []),
      delivery: {
        addressLine:
          deliveryAddress?.fullAddress ??
          deliveryAddress?.addressLine ??
          'Delivery address',
        lat: customerLat,
        lng: customerLng,
      },
      stages: {
        current: primaryStage,
        steps: buildSteps(primaryStage),
      },
      subOrders: subOrderDtos,
    };
  }

  private async resolveDeliveryAddress(customerId: string) {
    const addresses = await this.customerAddresses.find({
      where: { customerId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return addresses[0] ?? null;
  }

  private async loadAssignmentsBySubOrder(subOrderIds: string[]) {
    const map = new Map<string, DeliveryAssignmentEntity>();
    if (!subOrderIds.length) return map;

    const rows = await this.assignments.find({
      where: {
        subOrderId: In(subOrderIds),
        status: In([
          DeliveryAssignmentStatus.ACCEPTED,
          DeliveryAssignmentStatus.IN_PROGRESS,
          DeliveryAssignmentStatus.COMPLETED,
        ]),
      },
      relations: ['partnerProfile'],
      order: { createdAt: 'DESC' },
    });

    for (const row of rows) {
      if (!map.has(row.subOrderId)) {
        map.set(row.subOrderId, row);
      }
    }
    return map;
  }

  private estimateEtaMinutes(
    subOrders: Array<{ store?: { details?: object | null } | null }>,
  ): number {
    let max = 25;
    for (const sub of subOrders) {
      const details = (sub.store?.details as { deliveryMinutes?: number } | null) ?? {};
      const m = Number(details.deliveryMinutes);
      if (Number.isFinite(m) && m > max) max = m;
    }
    return max;
  }
}
