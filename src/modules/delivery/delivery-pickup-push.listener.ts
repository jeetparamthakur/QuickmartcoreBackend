import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DeliveryPartnerPushService } from './delivery-partner-push.service';

@Injectable()
export class DeliveryPickupPushListener {
  private readonly logger = new Logger(DeliveryPickupPushListener.name);

  constructor(private readonly pushService: DeliveryPartnerPushService) {}

  @OnEvent('suborder.ready_for_pickup')
  handleReadyForPickup(payload: { subOrderId: string }) {
    void this.pushService
      .notifyPickupAvailable(payload.subOrderId)
      .catch((err) => {
        this.logger.warn(
          `Pickup push failed for ${payload.subOrderId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
  }
}
