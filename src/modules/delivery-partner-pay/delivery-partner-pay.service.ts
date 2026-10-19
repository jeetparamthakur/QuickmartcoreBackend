import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeliveryPartnerPaySlabEntity } from './entities/delivery-partner-pay-slab.entity';
import {
  CreateDeliveryPartnerPaySlabDto,
  UpdateDeliveryPartnerPaySlabDto,
} from './dto/delivery-partner-pay-slab.dto';

export type AdminPartnerPaySlabView = {
  id: string;
  partnerProfileId: string | null;
  zoneId: string | null;
  minKm: number;
  maxKm: number;
  fee: number;
  isActive: boolean;
  createdAt: string;
};

@Injectable()
export class DeliveryPartnerPayService {
  constructor(
    @InjectRepository(DeliveryPartnerPaySlabEntity)
    private readonly slabs: Repository<DeliveryPartnerPaySlabEntity>,
  ) {}

  async listForAdmin(partnerProfileId?: string | null): Promise<AdminPartnerPaySlabView[]> {
    const where =
      partnerProfileId != null && partnerProfileId !== ''
        ? { partnerProfileId }
        : { partnerProfileId: IsNull() };

    const rows = await this.slabs.find({
      where,
      order: { minKm: 'ASC', createdAt: 'DESC' },
    });
    return rows.map((row) => this.toAdminView(row));
  }

  async getForAdmin(id: string) {
    const row = await this.slabs.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Pay slab not found');
    return this.toAdminView(row);
  }

  async create(dto: CreateDeliveryPartnerPaySlabDto) {
    if (dto.maxKm < dto.minKm) {
      throw new BadRequestException('maxKm must be >= minKm');
    }

    const row = await this.slabs.save(
      this.slabs.create({
        partnerProfileId: dto.partnerProfileId ?? null,
        zoneId: dto.zoneId ?? null,
        minKm: dto.minKm.toFixed(2),
        maxKm: dto.maxKm.toFixed(2),
        fee: dto.fee.toFixed(2),
        isActive: dto.isActive ?? true,
      }),
    );
    return this.toAdminView(row);
  }

  async update(id: string, dto: UpdateDeliveryPartnerPaySlabDto) {
    const row = await this.slabs.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Pay slab not found');

    if (dto.minKm !== undefined) row.minKm = dto.minKm.toFixed(2);
    if (dto.maxKm !== undefined) row.maxKm = dto.maxKm.toFixed(2);
    if (dto.fee !== undefined) row.fee = dto.fee.toFixed(2);
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    if (dto.partnerProfileId !== undefined) {
      row.partnerProfileId = dto.partnerProfileId ?? null;
    }
    if (dto.zoneId !== undefined) row.zoneId = dto.zoneId ?? null;

    const min = parseFloat(row.minKm);
    const max = parseFloat(row.maxKm);
    if (max < min) {
      throw new BadRequestException('maxKm must be >= minKm');
    }

    await this.slabs.save(row);
    return this.toAdminView(row);
  }

  async remove(id: string) {
    const row = await this.slabs.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Pay slab not found');
    await this.slabs.remove(row);
    return { success: true };
  }

  private toAdminView(row: DeliveryPartnerPaySlabEntity): AdminPartnerPaySlabView {
    return {
      id: row.id,
      partnerProfileId: row.partnerProfileId ?? null,
      zoneId: row.zoneId ?? null,
      minKm: parseFloat(row.minKm),
      maxKm: parseFloat(row.maxKm),
      fee: parseFloat(row.fee),
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
