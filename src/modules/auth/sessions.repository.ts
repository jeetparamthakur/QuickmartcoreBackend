import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSessionEntity } from './entities/user-session.entity';
import { SessionsRepositoryPort } from './sessions.repository.port';

@Injectable()
export class SessionsRepository implements SessionsRepositoryPort {
  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly repo: Repository<UserSessionEntity>,
  ) {}

  create(data: Partial<UserSessionEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async updateRefreshTokenHash(id: string, refreshTokenHash: string) {
    await this.repo.update(id, { refreshTokenHash });
  }

  async revoke(id: string) {
    await this.repo.update(id, { revokedAt: new Date() });
  }

  async revokeAllForUser(userId: string) {
    await this.repo.update(
      { userId, revokedAt: null as unknown as undefined },
      {
        revokedAt: new Date(),
      },
    );
  }
}
