import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export const REPORTS_QUEUE = 'reports';

export interface ReportJobPayload {
  reportType: string;
  requestedBy: string;
  filters?: Record<string, unknown>;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectQueue(REPORTS_QUEUE)
    private readonly reportsQueue: Queue<ReportJobPayload>,
  ) {}

  async enqueueReport(payload: ReportJobPayload) {
    const job = await this.reportsQueue.add('generate-report', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return {
      jobId: job.id,
      status: 'queued',
      reportType: payload.reportType,
    };
  }

  async getJobStatus(jobId: string) {
    const job = await this.reportsQueue.getJob(jobId);
    if (!job) {
      return { jobId, status: 'not_found' };
    }

    const state = await job.getState();
    return {
      jobId,
      status: state,
      progress: job.progress,
      result: job.returnvalue as unknown,
    };
  }
}
