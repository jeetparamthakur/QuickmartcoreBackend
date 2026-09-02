import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { SubOrderStatus, ActorType, ParentOrderStatus } from '../../common/enums';

const VALID_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
  [SubOrderStatus.PLACED]: [
    SubOrderStatus.ACCEPTED,
    SubOrderStatus.REJECTED,
    SubOrderStatus.CANCELLED,
  ],
  [SubOrderStatus.ACCEPTED]: [
    SubOrderStatus.PREPARING,
    SubOrderStatus.CANCELLED,
  ],
  [SubOrderStatus.PREPARING]: [SubOrderStatus.READY_FOR_PICKUP],
  [SubOrderStatus.READY_FOR_PICKUP]: [SubOrderStatus.DELIVERY_ASSIGNED],
  [SubOrderStatus.DELIVERY_ASSIGNED]: [SubOrderStatus.PICKED_UP],
  [SubOrderStatus.PICKED_UP]: [SubOrderStatus.OUT_FOR_DELIVERY],
  [SubOrderStatus.OUT_FOR_DELIVERY]: [SubOrderStatus.DELIVERED],
  [SubOrderStatus.DELIVERED]: [],
  [SubOrderStatus.REJECTED]: [],
  [SubOrderStatus.CANCELLED]: [SubOrderStatus.REFUND_PENDING],
  [SubOrderStatus.FAILED]: [SubOrderStatus.REFUND_PENDING],
  [SubOrderStatus.REFUND_PENDING]: [SubOrderStatus.REFUNDED],
  [SubOrderStatus.REFUNDED]: [],
};

@Injectable()
export class OrderStateMachineService {
  assertTransition(from: SubOrderStatus, to: SubOrderStatus) {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        message: `Invalid order transition from ${from} to ${to}`,
        errorCode: 'INVALID_ORDER_TRANSITION',
      });
    }
  }

  canCancel(status: SubOrderStatus) {
    return [
      SubOrderStatus.PLACED,
      SubOrderStatus.ACCEPTED,
      SubOrderStatus.PREPARING,
    ].includes(status);
  }

  mapParentStatus(subStatuses: SubOrderStatus[]): ParentOrderStatus {
    if (subStatuses.every((s) => s === SubOrderStatus.CANCELLED)) {
      return ParentOrderStatus.CANCELLED;
    }
    if (subStatuses.every((s) => s === SubOrderStatus.DELIVERED)) {
      return ParentOrderStatus.COMPLETED;
    }
    if (subStatuses.some((s) => s === SubOrderStatus.CANCELLED)) {
      return ParentOrderStatus.PARTIALLY_CANCELLED;
    }
    return ParentOrderStatus.CONFIRMED;
  }
}

export { ActorType };
