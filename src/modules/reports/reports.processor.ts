import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REPORTS_QUEUE, ReportJobPayload } from './reports.service';

@Processor(REPORTS_QUEUE)
export class ReportsProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportsProcessor.name);

  async process(job: Job<ReportJobPayload>) {
    this.logger.log(`Generating report: ${job.data.reportType}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      reportType: job.data.reportType,
      generatedAt: new Date().toISOString(),
      rowCount: 0,
      downloadUrl: null,
    };
  }
}
