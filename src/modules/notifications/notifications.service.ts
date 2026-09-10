import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  NotificationChannel,
  NotificationStatus,
  UserStatus,
  UserType,
} from '../../common/enums';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationEntity } from './entities/notification.entity';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  findByUser(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  create(data: Partial<NotificationEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async markSent(id: string) {
    await this.repo.update(id, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    });
    return this.findById(id);
  }
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  listForUser(userId: string) {
    return this.repo.findByUser(userId);
  }

  async get(id: string) {
    const notification = await this.repo.findById(id);
    if (!notification) {
      throw new NotFoundException({
        message: 'Notification not found',
        errorCode: 'NOTIFICATION_NOT_FOUND',
      });
    }
    return notification;
  }

  create(data: Partial<NotificationEntity>) {
    return this.repo.create(data);
  }

  send(id: string) {
    return this.repo.markSent(id);
  }

  async notifyUser(
    userId: string,
    title: string,
    body: string,
    payload: Record<string, unknown> = {},
  ) {
    return this.repo.create({
      userId,
      title,
      body,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      payload,
    });
  }

  async notifyAdmins(
    title: string,
    body: string,
    payload: Record<string, unknown> = {},
  ) {
    const admins = await this.users.find({
      where: {
        userType: In([UserType.ADMIN, UserType.SUPER_ADMIN]),
        status: UserStatus.ACTIVE,
      },
      select: ['id'],
    });

    if (!admins.length) return [];

    return Promise.all(
      admins.map((admin) => this.notifyUser(admin.id, title, body, payload)),
    );
  }
}
