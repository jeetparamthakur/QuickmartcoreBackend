import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { distanceKm } from '../../common/utils/geo';
import { CustomerAddressEntity } from '../customers/entities/customer-address.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { DeliveryAssignmentEntity } from '../delivery/entities/delivery-assignment.entity';
import { DeliveryPartnerPayEngineService } from './delivery-partner-pay-engine.service';

export type PickupCustomerCoords = {
  pickupLat: number;
  pickupLng: number;
  customerLat: number;
  customerLng: number;
  zoneId?: string | null;
};

@Injectable()
export class PartnerAssignmentPayService {
  constructor(
    private readonly payEngine: DeliveryPartnerPayEngineService,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
  ) {}

  resolveCoords(
    subOrder: SubOrderEntity,
    addressMap?: Map<string, CustomerAddressEntity>,
  ): PickupCustomerCoords {
    const store = subOrder.store;
    const seller = subOrder.independentSeller;
    let pickupLat = Number(store?.lat ?? 28.6139);
    let pickupLng = Number(store?.lng ?? 77.209);

    if (!store && seller) {
      pickupLat = Number(seller.pickupLat ?? pickupLat);
      pickupLng = Number(seller.pickupLng ?? pickupLng);
    }

    const customerId = subOrder.parentOrder?.customerId;
    const delivery = customerId ? addressMap?.get(customerId) : undefined;
    const customerLat = Number(delivery?.lat ?? pickupLat + 0.01);
    const customerLng = Number(delivery?.lng ?? pickupLng + 0.01);

    return {
      pickupLat,
      pickupLng,
      customerLat,
      customerLng,
      zoneId: null,
    };
  }

  async computeEarningAmount(
    partnerProfileId: string,
    subOrder: SubOrderEntity,
    addressMap?: Map<string, CustomerAddressEntity>,
  ): Promise<number> {
    const coords = this.resolveCoords(subOrder, addressMap);
    const tripKm = distanceKm(
      coords.pickupLat,
      coords.pickupLng,
      coords.customerLat,
      coords.customerLng,
    );
    const roundedKm = Math.max(0, Math.round(tripKm * 100) / 100);
    return this.payEngine.calculatePartnerPay(
      partnerProfileId,
      roundedKm,
      coords.zoneId,
    );
  }

  async computeForAssignment(
    assignment: DeliveryAssignmentEntity,
    addressMap?: Map<string, CustomerAddressEntity>,
  ): Promise<number> {
    const subOrder =
      assignment.subOrder ??
      (await this.subOrders.findOne({
        where: { id: assignment.subOrderId },
        relations: [
          'store',
          'independentSeller',
          'parentOrder',
          'parentOrder.customer',
        ],
      }));
    if (!subOrder) {
      return 0;
    }
    return this.computeEarningAmount(
      assignment.partnerProfileId,
      subOrder,
      addressMap,
    );
  }

  resolveDisplayedEarning(
    assignment: DeliveryAssignmentEntity,
    addressMap?: Map<string, CustomerAddressEntity>,
    fallbackCustomerDeliveryFee?: number,
  ): number {
    const stored = assignment.partnerEarning;
    if (stored != null && stored !== '') {
      return parseFloat(stored);
    }
    if (fallbackCustomerDeliveryFee != null && fallbackCustomerDeliveryFee > 0) {
      return fallbackCustomerDeliveryFee;
    }
    return 0;
  }

  async refreshPendingEarning(
    assignment: DeliveryAssignmentEntity,
    addressMap?: Map<string, CustomerAddressEntity>,
  ): Promise<number> {
    const amount = await this.computeForAssignment(assignment, addressMap);
    return amount;
  }
}
