import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ReportsService } from './reports.service';
import {
  AuthenticatedUser,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';

class EnqueueReportDto {
  @IsString()
  reportType!: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;
}

@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  @RequirePermissions('admin:all')
  enqueue(
    @Body() dto: EnqueueReportDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.service.enqueueReport({
      reportType: dto.reportType,
      requestedBy: req.user.id,
      filters: dto.filters,
    });
  }

  @Get(':jobId/status')
  @RequirePermissions('admin:all')
  status(@Param('jobId') jobId: string) {
    return this.service.getJobStatus(jobId);
  }
}
