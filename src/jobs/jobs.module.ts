import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { InventoryCleanupProcessor } from './processors/inventory-cleanup.processor';
import { INVENTORY_CLEANUP_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redisUrl') },
      }),
    }),
    BullModule.registerQueue({ name: INVENTORY_CLEANUP_QUEUE }),
  ],
  providers: [InventoryCleanupProcessor],
  exports: [BullModule],
})
export class JobsModule {}
