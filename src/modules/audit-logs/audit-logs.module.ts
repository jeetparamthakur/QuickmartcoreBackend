import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AuditLogEntity,
  IdempotencyKeyEntity,
} from './entities/audit-log.entity';
import { AuditLogsService, AuditLogsRepository } from './audit-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, IdempotencyKeyEntity])],
  providers: [AuditLogsService, AuditLogsRepository],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
