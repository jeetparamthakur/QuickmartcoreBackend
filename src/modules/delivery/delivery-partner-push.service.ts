import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalStatus, SubOrderStatus } from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { ExpoPushService } from '../notifications/expo-push.service';
import { subOrderMatchesPartner } from './delivery-partner-matching.util';

@Injectable()
export class DeliveryPartnerPushService {
  private readonly logger = new Logger(DeliveryPartnerPushService.name);

  constructor(
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly profiles: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    private readonly expoPush: ExpoPushService,
  ) {}

  async notifyPickupAvailable(subOrderId: string): Promise<void> {
    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
      relations: ['store', 'independentSeller'],
    });
    if (!subOrder || subOrder.status !== SubOrderStatus.READY_FOR_PICKUP) {
      return;
    }

    const partners = await this.profiles.find({
      where: {
        isOnline: true,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    const pickupLabel = this.pickupLabel(subOrder);
    const messages = partners
      .filter((p) => subOrderMatchesPartner(subOrder, p))
      .map((p) => p.profileDetails?.pushToken)
      .filter((token): token is string => Boolean(token))
      .map((token) => ({
        to: token,
        title: 'Naya pickup request',
        body: `Order ${subOrder.orderNumber} · ${pickupLabel}`,
        sound: 'default' as const,
        priority: 'high' as const,
        channelId: 'deliveries',
        data: {
          type: 'delivery_request',
          subOrderId: subOrder.id,
        },
      }));

    await this.expoPush.sendMessages(messages);
    this.logger.log(
      `Pickup push for sub-order ${subOrderId}: ${messages.length} recipient(s)`,
    );
  }

  async notifyPartnerAssignment(
    partnerProfileId: string,
    subOrderId: string,
    assignmentId: string,
  ): Promise<void> {
    const profile = await this.profiles.findOne({
      where: { id: partnerProfileId },
    });
    if (!profile?.isOnline || profile.approvalStatus !== ApprovalStatus.APPROVED) {
      return;
    }
    const token = profile.profileDetails?.pushToken;
    if (!token) return;

    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
      relations: ['store', 'independentSeller'],
    });
    if (!subOrder) return;

    const pickupLabel = this.pickupLabel(subOrder);
    await this.expoPush.sendMessages([
      {
        to: token,
        title: 'Naya pickup request',
        body: `Order ${subOrder.orderNumber} · ${pickupLabel}`,
        sound: 'default',
        priority: 'high',
        channelId: 'deliveries',
        data: {
          type: 'delivery_request',
          subOrderId: subOrder.id,
          assignmentId,
        },
      },
    ]);
  }

  private pickupLabel(subOrder: SubOrderEntity): string {
    if (subOrder.store?.address) {
      return subOrder.store.address.slice(0, 80);
    }
    if (subOrder.independentSeller?.businessName) {
      return subOrder.independentSeller.businessName;
    }
    return 'Pickup location';
  }
}
