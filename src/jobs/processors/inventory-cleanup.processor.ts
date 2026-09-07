import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { INVENTORY_CLEANUP_QUEUE } from '../jobs.constants';

@Processor(INVENTORY_CLEANUP_QUEUE)
export class InventoryCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(InventoryCleanupProcessor.name);

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing inventory cleanup job ${job.id}`);
    // Phase 1 stub: full expired reservation cleanup wired in Phase 2
  }
}
