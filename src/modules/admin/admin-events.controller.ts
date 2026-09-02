import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { AdminEventsService } from './admin-events.service';

@Controller('admin/events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.ADMIN, UserType.SUPER_ADMIN)
export class AdminEventsController {
  constructor(private readonly adminEvents: AdminEventsService) {}

  @Get()
  stream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const subscription = this.adminEvents.stream().subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    res.on('close', () => subscription.unsubscribe());
  }
}
