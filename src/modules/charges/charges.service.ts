import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargeRuleEntity } from './entities/charge-rule.entity';
import {
  CreateChargeRuleDto,
  UpdateChargeRuleDto,
} from './dto/create-charge-rule.dto';

export interface AdminChargeRuleView {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  conditions: Record<string, unknown>;
  priority: number;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class ChargesService {
  constructor(
    @InjectRepository(ChargeRuleEntity)
    private readonly chargeRules: Repository<ChargeRuleEntity>,
  ) {}

  async listForAdmin(): Promise<AdminChargeRuleView[]> {
    const rules = await this.chargeRules.find({
      order: { priority: 'ASC', createdAt: 'DESC' },
    });
    return rules.map((rule) => this.toAdminView(rule));
  }

  async getForAdmin(id: string) {
    const rule = await this.chargeRules.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Charge rule not found');
    return this.toAdminView(rule);
  }

  async create(dto: CreateChargeRuleDto) {
    const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.chargeRules.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Charge code already exists');
    }

    const rule = await this.chargeRules.save(
      this.chargeRules.create({
        code,
        name: dto.name.trim(),
        type: dto.type,
        value: dto.value.toFixed(4),
        conditions: (dto.conditions ?? {}) as Record<string, unknown>,
        priority: dto.priority ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );

    return this.toAdminView(rule);
  }

  async update(id: string, dto: UpdateChargeRuleDto) {
    const rule = await this.chargeRules.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Charge rule not found');

    if (dto.code !== undefined) {
      const code = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
      const existing = await this.chargeRules.findOne({ where: { code } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Charge code already exists');
      }
      rule.code = code;
    }
    if (dto.name !== undefined) rule.name = dto.name.trim();
    if (dto.type !== undefined) rule.type = dto.type;
    if (dto.value !== undefined) rule.value = dto.value.toFixed(4);
    if (dto.conditions !== undefined) {
      rule.conditions = dto.conditions as Record<string, unknown>;
    }
    if (dto.priority !== undefined) rule.priority = dto.priority;
    if (dto.isActive !== undefined) rule.isActive = dto.isActive;

    const saved = await this.chargeRules.save(rule);
    return this.toAdminView(saved);
  }

  async remove(id: string) {
    const rule = await this.chargeRules.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Charge rule not found');
    await this.chargeRules.remove(rule);
    return { success: true };
  }

  private toAdminView(rule: ChargeRuleEntity): AdminChargeRuleView {
    return {
      id: rule.id,
      code: rule.code,
      name: rule.name,
      type: rule.type,
      value: parseFloat(rule.value),
      conditions: rule.conditions ?? {},
      priority: rule.priority,
      isActive: rule.isActive,
      createdAt: rule.createdAt.toISOString(),
    };
  }
}
