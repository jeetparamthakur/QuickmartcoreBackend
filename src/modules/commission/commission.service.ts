import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommissionRuleType, SellerType } from '../../common/enums';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import {
  CommissionEngineService,
  CommissionRepository,
} from './commission-engine.service';
import {
  CreateCommissionRuleDto,
  UpdateCommissionRuleDto,
} from './dto/create-commission-rule.dto';
import { CommissionRuleEntity } from './entities/commission-rule.entity';

export type AdminCommissionScope = 'GLOBAL' | 'STORE' | 'SELLER';

export interface AdminCommissionRuleView {
  id: string;
  code: string;
  name: string;
  scope: AdminCommissionScope;
  sellerType: SellerType | null;
  targetId?: string | null;
  targetName?: string | null;
  type: CommissionRuleType;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class CommissionService {
  constructor(
    private readonly repo: CommissionRepository,
    private readonly engine: CommissionEngineService,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
  ) {}

  async listForAdmin(): Promise<AdminCommissionRuleView[]> {
    const rules = await this.repo.findAll();
    return Promise.all(rules.map((rule) => this.toAdminView(rule)));
  }

  async getForAdmin(id: string) {
    const rule = await this.repo.findById(id);
    if (!rule) throw new NotFoundException('Commission rule not found');
    return this.toAdminView(rule);
  }

  async create(dto: CreateCommissionRuleDto) {
    if (dto.targetId) {
      await this.assertTargetExists(dto.sellerType, dto.targetId);
    }

    const code = this.buildCode(dto.sellerType, dto.targetId);
    const rule = await this.repo.create({
      code,
      name: dto.name.trim(),
      type: dto.type,
      value: dto.value.toFixed(4),
      sellerType: dto.sellerType,
      targetId: dto.targetId ?? null,
      effectiveFrom: dto.effectiveFrom.slice(0, 10),
      effectiveTo: dto.effectiveTo ? dto.effectiveTo.slice(0, 10) : null,
      priority:
        dto.priority ??
        (dto.targetId ? 0 : dto.sellerType === SellerType.STORE ? 1 : 2),
      isActive: dto.isActive ?? true,
      conditions: {},
    });

    return this.toAdminView(rule);
  }

  async update(id: string, dto: UpdateCommissionRuleDto) {
    const rule = await this.repo.findById(id);
    if (!rule) throw new NotFoundException('Commission rule not found');

    if (dto.targetId) {
      await this.assertTargetExists(
        dto.sellerType ?? rule.sellerType!,
        dto.targetId,
      );
    }

    if (dto.name !== undefined) rule.name = dto.name.trim();
    if (dto.sellerType !== undefined) rule.sellerType = dto.sellerType;
    if (dto.type !== undefined) rule.type = dto.type;
    if (dto.value !== undefined) rule.value = dto.value.toFixed(4);
    if (dto.targetId !== undefined) rule.targetId = dto.targetId;
    if (dto.effectiveFrom !== undefined)
      rule.effectiveFrom = dto.effectiveFrom.slice(0, 10);
    if (dto.effectiveTo !== undefined) {
      rule.effectiveTo = dto.effectiveTo ? dto.effectiveTo.slice(0, 10) : null;
    }
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    const saved = await this.repo.save(rule);
    return this.toAdminView(saved);
  }

  async remove(id: string) {
    const rule = await this.repo.findById(id);
    if (!rule) throw new NotFoundException('Commission rule not found');
    await this.repo.remove(rule);
    return { success: true };
  }

  getCurrentRateForSeller(sellerType: SellerType, targetId?: string) {
    return this.engine.getCurrentRate({ sellerType, targetId });
  }

  getScheduledChangeForSeller(sellerType: SellerType, targetId?: string) {
    return this.engine.getScheduledRateChange({ sellerType, targetId });
  }

  private async assertTargetExists(sellerType: SellerType, targetId: string) {
    if (sellerType === SellerType.STORE) {
      const store = await this.stores.findOne({ where: { id: targetId } });
      if (!store) throw new BadRequestException('Store not found');
      return;
    }

    const seller = await this.independentSellers.findOne({
      where: { id: targetId },
    });
    if (!seller) throw new BadRequestException('Independent seller not found');
  }

  private buildCode(sellerType: SellerType, targetId?: string) {
    const prefix = sellerType === SellerType.STORE ? 'STORE' : 'INDEPENDENT';
    const suffix = targetId ? targetId.slice(0, 8).toUpperCase() : 'DEFAULT';
    return `${prefix}_${suffix}_${Date.now()}`;
  }

  private async toAdminView(
    rule: CommissionRuleEntity,
  ): Promise<AdminCommissionRuleView> {
    let targetName: string | null = null;
    if (rule.targetId && rule.sellerType === SellerType.STORE) {
      const store = await this.stores.findOne({ where: { id: rule.targetId } });
      targetName = store?.name ?? null;
    } else if (rule.targetId && rule.sellerType === SellerType.INDEPENDENT) {
      const seller = await this.independentSellers.findOne({
        where: { id: rule.targetId },
      });
      targetName = seller?.businessName ?? null;
    }

    const scope: AdminCommissionScope = rule.targetId
      ? rule.sellerType === SellerType.STORE
        ? 'STORE'
        : 'SELLER'
      : 'GLOBAL';

    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      scope,
      sellerType: rule.sellerType ?? null,
      targetId: rule.targetId ?? null,
      targetName,
      type: rule.type,
      rate: parseFloat(rule.value),
      effectiveFrom: rule.effectiveFrom,
      effectiveTo: rule.effectiveTo ?? null,
      priority: rule.priority,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
    };
  }
}
