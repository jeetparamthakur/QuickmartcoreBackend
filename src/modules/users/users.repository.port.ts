import { UserType } from '../../common/enums';
import { UserEntity } from './entities/user.entity';

export interface UsersRepositoryPort {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findByPhoneAndUserTypes(
    phone: string,
    userTypes: UserType[],
  ): Promise<UserEntity | null>;
  create(data: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
}

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');
