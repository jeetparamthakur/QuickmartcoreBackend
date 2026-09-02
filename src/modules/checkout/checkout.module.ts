import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { CustomersModule } from '../customers/customers.module';
import { IdempotencyKeyEntity } from '../audit-logs/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([IdempotencyKeyEntity]),
    CartModule,
    PricingModule,
    InventoryModule,
    OrdersModule,
    CustomersModule,
  ],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
