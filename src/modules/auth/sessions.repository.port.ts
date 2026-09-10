import { UserSessionEntity } from './entities/user-session.entity';

export interface SessionsRepositoryPort {
  create(data: Partial<UserSessionEntity>): Promise<UserSessionEntity>;
  findById(id: string): Promise<UserSessionEntity | null>;
  updateRefreshTokenHash(id: string, refreshTokenHash: string): Promise<void>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const SESSIONS_REPOSITORY = Symbol('SESSIONS_REPOSITORY');
