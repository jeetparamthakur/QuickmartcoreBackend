import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationEntity } from './entities/notification.entity';
import {
  NotificationsService,
  NotificationsRepository,
} from './notifications.service';
import { ExpoPushService } from './expo-push.service';
import {
  NotificationsController,
  NotificationsAdminController,
} from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, UserEntity])],
  controllers: [NotificationsController, NotificationsAdminController],
  providers: [NotificationsService, NotificationsRepository, ExpoPushService],
  exports: [NotificationsService, ExpoPushService],
})
export class NotificationsModule {}
