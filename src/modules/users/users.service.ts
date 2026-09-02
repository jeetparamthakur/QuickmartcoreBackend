import { Inject, Injectable } from '@nestjs/common';
import { USERS_REPOSITORY } from './users.repository.port';
import type { UsersRepositoryPort } from './users.repository.port';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepo: UsersRepositoryPort,
  ) {}

  findById(id: string) {
    return this.usersRepo.findById(id);
  }

  findByEmail(email: string) {
    return this.usersRepo.findByEmail(email);
  }
}
