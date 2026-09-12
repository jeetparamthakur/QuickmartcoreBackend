import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  createRedisConnectionOptions,
  isLocalRedisUrl,
} from '../config/redis-connection';
import { InventoryCleanupProcessor } from './processors/inventory-cleanup.processor';
import { INVENTORY_CLEANUP_QUEUE } from './jobs.constants';

const logger = new Logger('JobsModule');

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl =
          config.get<string>('redisUrl') ?? 'redis://localhost:6379';

        if (
          config.get<string>('nodeEnv') === 'production' &&
          isLocalRedisUrl(redisUrl)
        ) {
          logger.error(
            'REDIS_URL points to localhost in production. Provision a Render Key Value instance and set REDIS_URL to its internal connection string.',
          );
        }

        return {
          connection: createRedisConnectionOptions(redisUrl),
        };
      },
    }),
    BullModule.registerQueue({ name: INVENTORY_CLEANUP_QUEUE }),
  ],
  providers: [InventoryCleanupProcessor],
  exports: [BullModule],
})
export class JobsModule {}
