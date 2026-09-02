import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsService, REPORTS_QUEUE } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';

@Module({
  imports: [BullModule.registerQueue({ name: REPORTS_QUEUE })],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
