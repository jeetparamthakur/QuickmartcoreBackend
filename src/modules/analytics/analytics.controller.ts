import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../../common/decorators/auth.decorators';

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('admin:all')
  dashboard() {
    return this.service.getDashboardSummary();
  }

  @Get('orders')
  @RequirePermissions('admin:all')
  orders() {
    return this.service.getOrderAnalytics();
  }

  @Get('users')
  @RequirePermissions('admin:all')
  users() {
    return this.service.getUserAnalytics();
  }
}
