import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InventoryItemEntity } from './entities/inventory-item.entity';
import { InventoryReservationEntity } from './entities/inventory-reservation.entity';
import { InventoryStatus, ReservationStatus } from '../../common/enums';

export interface InventoryReserveItem {
  sellerProductId: string;
  quantity: number;
}

@Injectable()
export class InventoryRepository {
  constructor(
    @InjectRepository(InventoryItemEntity)
    private readonly inventoryRepo: Repository<InventoryItemEntity>,
    @InjectRepository(InventoryReservationEntity)
    private readonly reservationRepo: Repository<InventoryReservationEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  findBySellerProductId(sellerProductId: string) {
    return this.inventoryRepo.findOne({ where: { sellerProductId } });
  }

  async reserve(parentOrderId: string, items: InventoryReserveItem[]) {
    return this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        const inventory = await manager
          .getRepository(InventoryItemEntity)
          .createQueryBuilder('inv')
          .setLock('pessimistic_write')
          .where('inv.seller_product_id = :id', { id: item.sellerProductId })
          .getOne();

        if (!inventory) {
          throw new NotFoundException({
            message: `Inventory not found for product ${item.sellerProductId}`,
            errorCode: 'INVENTORY_NOT_FOUND',
          });
        }

        const available =
          inventory.quantityAvailable - inventory.quantityReserved;
        if (available < item.quantity) {
          throw new ConflictException({
            message: 'Insufficient stock',
            errorCode: 'INSUFFICIENT_STOCK',
          });
        }

        inventory.quantityReserved += item.quantity;
        inventory.status =
          inventory.quantityAvailable - inventory.quantityReserved <= 0
            ? InventoryStatus.OUT_OF_STOCK
            : InventoryStatus.AVAILABLE;

        await manager.save(inventory);
        await manager.save(
          manager.create(InventoryReservationEntity, {
            parentOrderId,
            sellerProductId: item.sellerProductId,
            quantity: item.quantity,
            status: ReservationStatus.HELD,
          }),
        );
      }
    });
  }

  async release(parentOrderId: string) {
    return this.dataSource.transaction(async (manager) => {
      const reservations = await manager.find(InventoryReservationEntity, {
        where: { parentOrderId, status: ReservationStatus.HELD },
      });

      for (const reservation of reservations) {
        const inventory = await manager
          .getRepository(InventoryItemEntity)
          .createQueryBuilder('inv')
          .setLock('pessimistic_write')
          .where('inv.seller_product_id = :id', {
            id: reservation.sellerProductId,
          })
          .getOne();

        if (inventory) {
          inventory.quantityReserved = Math.max(
            0,
            inventory.quantityReserved - reservation.quantity,
          );
          inventory.status =
            inventory.quantityAvailable - inventory.quantityReserved > 0
              ? InventoryStatus.AVAILABLE
              : InventoryStatus.OUT_OF_STOCK;
          await manager.save(inventory);
        }

        reservation.status = ReservationStatus.RELEASED;
        await manager.save(reservation);
      }
    });
  }

  updateInventory(
    id: string,
    data: Pick<InventoryItemEntity, 'quantityAvailable' | 'quantityReserved' | 'status'>,
  ) {
    return this.inventoryRepo.update(id, data);
  }
}

@Injectable()
export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  reserve(parentOrderId: string, items: InventoryReserveItem[]) {
    return this.repo.reserve(parentOrderId, items);
  }

  release(parentOrderId: string) {
    return this.repo.release(parentOrderId);
  }
}
