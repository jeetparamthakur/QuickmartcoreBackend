import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { UsersRepositoryPort } from './users.repository.port';

@Injectable()
export class UsersRepository implements UsersRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  findByPhone(phone: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { phone } });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.repo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  }
}
