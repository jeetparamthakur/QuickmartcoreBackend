import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemEntity } from './entities/inventory-item.entity';
import { InventoryReservationEntity } from './entities/inventory-reservation.entity';
import { InventoryRepository, InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryItemEntity,
      InventoryReservationEntity,
    ]),
  ],
  providers: [InventoryRepository, InventoryService],
  exports: [InventoryService, InventoryRepository],
})
export class InventoryModule {}
