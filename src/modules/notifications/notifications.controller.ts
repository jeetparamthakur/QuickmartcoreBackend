import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  AuthenticatedUser,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { NotificationsService } from './notifications.service';

class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  payload?: Record<string, unknown>;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequirePermissions('orders:read')
  list(@Req() req: { user: AuthenticatedUser }) {
    return this.service.listForUser(req.user.id);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
}

@Controller('admin/notifications')
export class NotificationsAdminController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @RequirePermissions('admin:all')
  create(@Body() dto: CreateNotificationDto) {
    return this.service.create(dto);
  }

  @Post(':id/send')
  @RequirePermissions('admin:all')
  send(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.send(id);
  }
}
