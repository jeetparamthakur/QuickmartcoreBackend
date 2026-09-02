import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentOrderEntity } from './entities/parent-order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderStatusHistoryEntity } from './entities/order-status-history.entity';
import { OrdersController } from './orders.controller';
import { OrdersService, OrdersRepository } from './orders.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { CustomersModule } from '../customers/customers.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParentOrderEntity,
      SubOrderEntity,
      OrderItemEntity,
      OrderStatusHistoryEntity,
    ]),
    CustomersModule,
    InventoryModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrderStateMachineService],
  exports: [OrdersService, OrdersRepository, OrderStateMachineService],
})
export class OrdersModule {}
