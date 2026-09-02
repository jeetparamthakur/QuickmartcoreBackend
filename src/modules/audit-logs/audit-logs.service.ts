import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { ActorType } from '../../common/enums';

@Injectable()
export class AuditLogsRepository {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly repo: Repository<AuditLogEntity>,
  ) {}

  create(data: Partial<AuditLogEntity>) {
    return this.repo.save(this.repo.create(data));
  }
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly repo: AuditLogsRepository) {}

  log(data: Partial<AuditLogEntity>) {
    return this.repo.create(data);
  }

  @OnEvent('order.created')
  handleOrderCreated(payload: {
    parentOrderId: string;
    customerId: string;
    actorId: string;
  }) {
    return this.log({
      actorId: payload.actorId,
      actorType: ActorType.CUSTOMER,
      action: 'ORDER_CREATED',
      module: 'orders',
      entity: 'ParentOrder',
      entityId: payload.parentOrderId,
      newValue: { customerId: payload.customerId },
    });
  }

  @OnEvent('inventory.reserved')
  handleInventoryReserved(payload: {
    parentOrderId: string;
    items: Array<{ sellerProductId: string; quantity: number }>;
  }) {
    return this.log({
      actorType: ActorType.SYSTEM,
      action: 'INVENTORY_RESERVED',
      module: 'inventory',
      entity: 'ParentOrder',
      entityId: payload.parentOrderId,
      newValue: { items: payload.items },
    });
  }
}
