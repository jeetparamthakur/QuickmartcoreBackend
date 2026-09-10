import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '../../common/enums';
import {
  AdminActivityEntity,
  AdminPermissionsEntity,
  AdminProfileEntity,
  RestrictionAuditLogEntity,
} from './entities/admin-profile.entity';
import {
  applyTemporaryRestrictions,
  createDefaultAdminPermissions,
  AdminPermissionsMatrix,
} from './constants/admin-permissions.defaults';
import { AdminEventsService } from './admin-events.service';
import { SESSIONS_REPOSITORY } from '../auth/sessions.repository.port';
import { Inject } from '@nestjs/common';
import type { SessionsRepositoryPort } from '../auth/sessions.repository.port';
import { paginate } from '../../common/dto/pagination.dto';

@Injectable()
export class AdminControlService {
  constructor(
    @InjectRepository(AdminProfileEntity)
    private readonly adminProfiles: Repository<AdminProfileEntity>,
    @InjectRepository(AdminPermissionsEntity)
    private readonly adminPermissions: Repository<AdminPermissionsEntity>,
    @InjectRepository(AdminActivityEntity)
    private readonly activities: Repository<AdminActivityEntity>,
    @InjectRepository(RestrictionAuditLogEntity)
    private readonly restrictionLogs: Repository<RestrictionAuditLogEntity>,
    @Inject(SESSIONS_REPOSITORY)
    private readonly sessionsRepo: SessionsRepositoryPort,
    private readonly adminEvents: AdminEventsService,
  ) {}

  private async getAdminProfile() {
    const admin = await this.adminProfiles.findOne({
      where: { isSuperAdmin: false },
      relations: ['user'],
    });
    if (!admin) {
      throw new NotFoundException({
        message: 'Admin profile not found',
        errorCode: 'ADMIN_NOT_FOUND',
      });
    }
    return admin;
  }

  private async getPermissionsEntity(adminProfileId: string) {
    let permissions = await this.adminPermissions.findOne({
      where: { adminProfileId },
    });
    if (!permissions) {
      const defaults = createDefaultAdminPermissions();
      permissions = await this.adminPermissions.save(
        this.adminPermissions.create({
          adminProfileId,
          permissionVersion: defaults.permissionVersion,
          modulePermissions: defaults.modulePermissions,
          featurePermissions: defaults.featurePermissions,
          actionPermissions: defaults.actionPermissions,
          temporaryRestrictions: defaults.temporaryRestrictions,
        }),
      );
    }
    return permissions;
  }

  private toPermissionsMatrix(
    entity: AdminPermissionsEntity,
  ): AdminPermissionsMatrix {
    return {
      permissionVersion: entity.permissionVersion,
      modulePermissions: entity.modulePermissions,
      featurePermissions: entity.featurePermissions,
      actionPermissions: entity.actionPermissions,
      temporaryRestrictions:
        entity.temporaryRestrictions as AdminPermissionsMatrix['temporaryRestrictions'],
    };
  }

  private async savePermissions(
    entity: AdminPermissionsEntity,
    matrix: AdminPermissionsMatrix,
    performedBy: string,
    audit?: {
      module?: string;
      feature?: string;
      oldValue: string;
      newValue: string;
      reason?: string;
    },
  ) {
    entity.permissionVersion = matrix.permissionVersion;
    entity.modulePermissions = matrix.modulePermissions;
    entity.featurePermissions = matrix.featurePermissions;
    entity.actionPermissions = matrix.actionPermissions;
    entity.temporaryRestrictions = matrix.temporaryRestrictions;
    await this.adminPermissions.save(entity);

    if (audit) {
      await this.restrictionLogs.save(
        this.restrictionLogs.create({
          adminProfileId: entity.adminProfileId,
          performedBy,
          action: 'Admin Access Updated',
          module: audit.module ?? null,
          feature: audit.feature ?? null,
          oldValue: audit.oldValue,
          newValue: audit.newValue,
          reason: audit.reason ?? null,
        }),
      );
    }

    this.adminEvents.emit({
      type: 'PERMISSIONS_UPDATED',
      permissionVersion: matrix.permissionVersion,
    });
  }

  async getAdminProfileResponse() {
    const admin = await this.getAdminProfile();
    const sessionCount = 1;
    return {
      id: admin.id,
      name: admin.fullName,
      email: admin.user?.email ?? '',
      mobile: admin.mobile ?? '',
      accountStatus: admin.accountStatus,
      loginEnabled: admin.loginEnabled,
      emergencyLocked: admin.emergencyLocked,
      lastLogin: admin.user?.lastLoginAt?.toISOString() ?? null,
      lastActiveAt: admin.lastActiveAt?.toISOString() ?? null,
      isOnline: true,
      activeSessionCount: sessionCount,
      createdAt: admin.createdAt.toISOString(),
    };
  }

  async updateStatus(status: UserStatus) {
    const admin = await this.getAdminProfile();
    admin.accountStatus = status;
    await this.adminProfiles.save(admin);
    return this.getAdminProfileResponse();
  }

  async updateLoginAccess(enabled: boolean) {
    const admin = await this.getAdminProfile();
    admin.loginEnabled = enabled;
    await this.adminProfiles.save(admin);
    return this.getAdminProfileResponse();
  }

  async forceLogout() {
    const admin = await this.getAdminProfile();
    await this.sessionsRepo.revokeAllForUser(admin.userId);
    this.adminEvents.emit({ type: 'SESSION_REVOKED' });
    return { success: true, message: 'All admin sessions invalidated' };
  }

  async terminateSessions() {
    return this.forceLogout();
  }

  async emergencyLock() {
    const admin = await this.getAdminProfile();
    admin.emergencyLocked = true;
    admin.loginEnabled = false;
    await this.adminProfiles.save(admin);
    await this.sessionsRepo.revokeAllForUser(admin.userId);
    this.adminEvents.emit({ type: 'EMERGENCY_LOCK' });
    return this.getAdminProfileResponse();
  }

  async emergencyUnlock() {
    const admin = await this.getAdminProfile();
    admin.emergencyLocked = false;
    admin.loginEnabled = true;
    await this.adminProfiles.save(admin);
    this.adminEvents.emit({ type: 'EMERGENCY_UNLOCK' });
    return this.getAdminProfileResponse();
  }

  async getPermissions() {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    return this.toPermissionsMatrix(entity);
  }

  async getEffectivePermissions() {
    const matrix = await this.getPermissions();
    return applyTemporaryRestrictions(matrix);
  }

  async restoreFullAccess() {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const current = this.toPermissionsMatrix(entity);
    const restored = createDefaultAdminPermissions();
    restored.permissionVersion = current.permissionVersion + 1;
    await this.savePermissions(entity, restored, 'Super Admin');
    return restored;
  }

  async updateModulePermissions(
    modules: Record<string, boolean>,
    reason?: string,
  ) {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const matrix = this.toPermissionsMatrix(entity);
    matrix.permissionVersion += 1;
    matrix.modulePermissions = { ...matrix.modulePermissions, ...modules };
    await this.savePermissions(entity, matrix, 'Super Admin', {
      module: Object.keys(modules)[0],
      oldValue: 'Previous',
      newValue: 'Updated',
      reason,
    });
    return matrix;
  }

  async updateFeaturePermissions(
    module: string,
    features: Record<string, boolean>,
  ) {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const matrix = this.toPermissionsMatrix(entity);
    matrix.permissionVersion += 1;
    matrix.featurePermissions[
      module as keyof typeof matrix.featurePermissions
    ] = {
      ...(matrix.featurePermissions[
        module as keyof typeof matrix.featurePermissions
      ] ?? {}),
      ...features,
    };
    await this.savePermissions(entity, matrix, 'Super Admin', {
      module,
      oldValue: 'Previous',
      newValue: 'Updated',
    });
    return matrix;
  }

  async updateActionPermissions(actions: Record<string, boolean>) {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const matrix = this.toPermissionsMatrix(entity);
    matrix.permissionVersion += 1;
    matrix.actionPermissions = { ...matrix.actionPermissions, ...actions };
    await this.savePermissions(entity, matrix, 'Super Admin');
    return matrix;
  }

  async addTemporaryRestriction(dto: {
    module?: string;
    feature?: string;
    from: string;
    until: string;
    autoRestore: boolean;
    reason?: string;
  }) {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const matrix = this.toPermissionsMatrix(entity);
    matrix.permissionVersion += 1;
    matrix.temporaryRestrictions.push({
      id: uuidv4(),
      module:
        dto.module as AdminPermissionsMatrix['temporaryRestrictions'][0]['module'],
      feature: dto.feature,
      from: dto.from,
      until: dto.until,
      autoRestore: dto.autoRestore,
      reason: dto.reason,
    });
    await this.savePermissions(entity, matrix, 'Super Admin', {
      module: dto.module,
      feature: dto.feature,
      oldValue: 'Enabled',
      newValue: 'Restricted',
      reason: dto.reason,
    });
    return matrix;
  }

  async removeTemporaryRestriction(id: string) {
    const admin = await this.getAdminProfile();
    const entity = await this.getPermissionsEntity(admin.id);
    const matrix = this.toPermissionsMatrix(entity);
    matrix.permissionVersion += 1;
    matrix.temporaryRestrictions = matrix.temporaryRestrictions.filter(
      (r) => r.id !== id,
    );
    await this.savePermissions(entity, matrix, 'Super Admin');
    return matrix;
  }

  async getMetrics() {
    const admin = await this.getAdminProfile();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const actionsToday = await this.activities.count({
      where: { adminProfileId: admin.id },
    });
    return {
      isOnline: true,
      lastLogin: admin.user?.lastLoginAt?.toISOString() ?? null,
      activeSessions: 1,
      actionsToday,
      actionsThisWeek: actionsToday,
      ordersManaged: 0,
      storesManaged: 0,
      sellersApproved: 0,
      productsApproved: 0,
      payoutActions: 0,
      settingsChanged: 0,
    };
  }

  async getActivity(page = 1, module?: string) {
    const admin = await this.getAdminProfile();
    const qb = this.activities
      .createQueryBuilder('a')
      .where('a.admin_profile_id = :id', { id: admin.id })
      .orderBy('a.created_at', 'DESC');

    if (module) qb.andWhere('a.module = :module', { module });

    const [data, total] = await qb
      .skip((page - 1) * 20)
      .take(20)
      .getManyAndCount();

    return paginate(
      data.map((a) => ({
        id: a.id,
        action: a.action,
        module: a.module,
        entity: a.entity,
        entityId: a.entityId,
        timestamp: a.createdAt.toISOString(),
        sessionId: a.sessionId ?? '',
        ipAddress: a.ipAddress ?? undefined,
      })),
      total,
      page,
      20,
    );
  }

  assertAdminAccess(admin: AdminProfileEntity) {
    if (admin.emergencyLocked || !admin.loginEnabled) {
      throw new ForbiddenException({
        message: 'Admin access blocked',
        errorCode: 'ADMIN_ACCESS_BLOCKED',
      });
    }
    if (
      admin.accountStatus === UserStatus.BLOCKED ||
      admin.accountStatus === UserStatus.SUSPENDED
    ) {
      throw new ForbiddenException({
        message: 'Admin account suspended',
        errorCode: 'ADMIN_SUSPENDED',
      });
    }
  }
}
