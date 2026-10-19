import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, MoreThan, Repository } from 'typeorm';
import { DeliveryAssignmentStatus } from '../../common/enums';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { PartnerShiftEntity } from './entities/partner-shift.entity';

const PARTNER_TIMEZONE = 'Asia/Kolkata';
const EARNINGS_PER_DELIVERY = 50;

export type PartnerShiftHistoryDto = {
  id: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  deliveriesCompleted: number;
  earnings: number;
};

export type PartnerOnlineStatusDto = {
  isOnline: boolean;
  currentShiftStartedAt: string | null;
  todayOnlineMinutes: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function getIstYmd(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PARTNER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')!.value);
  const m = Number(parts.find((p) => p.type === 'month')!.value);
  const d = Number(parts.find((p) => p.type === 'day')!.value);
  return { y, m, d };
}

function startOfIstDay(date: Date): Date {
  const { y, m, d } = getIstYmd(date);
  return new Date(`${y}-${pad2(m)}-${pad2(d)}T00:00:00+05:30`);
}

function durationMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
}

function minutesInWindow(
  shiftStart: Date,
  shiftEnd: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const start = Math.max(shiftStart.getTime(), windowStart.getTime());
  const end = Math.min(shiftEnd.getTime(), windowEnd.getTime());
  if (end <= start) return 0;
  return Math.floor((end - start) / 60000);
}

@Injectable()
export class PartnerShiftService {
  constructor(
    @InjectRepository(PartnerShiftEntity)
    private readonly shifts: Repository<PartnerShiftEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
  ) {}

  async findOpenShift(partnerProfileId: string): Promise<PartnerShiftEntity | null> {
    return this.shifts.findOne({
      where: { partnerProfileId, endedAt: IsNull() },
      order: { startedAt: 'DESC' },
    });
  }

  async startShift(partnerProfileId: string): Promise<PartnerShiftEntity> {
    const open = await this.findOpenShift(partnerProfileId);
    if (open) return open;

    return this.shifts.save(
      this.shifts.create({
        partnerProfileId,
        startedAt: new Date(),
        endedAt: null,
        deliveriesCompleted: 0,
        earnings: '0',
      }),
    );
  }

  async endOpenShift(partnerProfileId: string): Promise<PartnerShiftEntity | null> {
    const open = await this.findOpenShift(partnerProfileId);
    if (!open) return null;

    const endedAt = new Date();
    const deliveriesCompleted = await this.assignments.count({
      where: {
        partnerProfileId,
        status: DeliveryAssignmentStatus.COMPLETED,
        updatedAt: Between(open.startedAt, endedAt),
      },
    });
    const earnings = deliveriesCompleted * EARNINGS_PER_DELIVERY;

    open.endedAt = endedAt;
    open.deliveriesCompleted = deliveriesCompleted;
    open.earnings = String(earnings);
    return this.shifts.save(open);
  }

  async getActiveShiftStartedAt(
    partnerProfileId: string,
  ): Promise<Date | null> {
    const open = await this.findOpenShift(partnerProfileId);
    return open?.startedAt ?? null;
  }

  async getTodayOnlineMinutes(partnerProfileId: string): Promise<number> {
    const now = new Date();
    const dayStart = startOfIstDay(now);
    const tomorrowStart = startOfIstDay(new Date(now.getTime() + 86400000));

    const overlapping = await this.shifts
      .createQueryBuilder('s')
      .where('s.partner_profile_id = :partnerProfileId', { partnerProfileId })
      .andWhere('s.started_at < :now', { now })
      .andWhere('(s.ended_at IS NULL OR s.ended_at > :dayStart)', { dayStart })
      .getMany();

    let total = 0;
    for (const shift of overlapping) {
      const end = shift.endedAt ?? now;
      total += minutesInWindow(shift.startedAt, end, dayStart, tomorrowStart);
    }
    return total;
  }

  async buildOnlineStatusPayload(
    partnerProfileId: string,
    isOnline: boolean,
  ): Promise<PartnerOnlineStatusDto> {
    const startedAt = isOnline
      ? await this.getActiveShiftStartedAt(partnerProfileId)
      : null;
    const todayOnlineMinutes = await this.getTodayOnlineMinutes(partnerProfileId);
    return {
      isOnline,
      currentShiftStartedAt: startedAt ? startedAt.toISOString() : null,
      todayOnlineMinutes,
    };
  }

  async getShiftHistory(
    partnerProfileId: string,
    limit = 30,
  ): Promise<PartnerShiftHistoryDto[]> {
    const rows = await this.shifts.find({
      where: {
        partnerProfileId,
        endedAt: MoreThan(new Date(0)),
      },
      order: { startedAt: 'DESC' },
      take: limit,
    });

    return rows
      .filter((row) => row.endedAt != null)
      .map((row) => {
        const endedAt = row.endedAt!;
        return {
          id: row.id,
          startedAt: row.startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMinutes: durationMinutes(row.startedAt, endedAt),
          deliveriesCompleted: row.deliveriesCompleted,
          earnings: Number(row.earnings ?? 0),
        };
      });
  }
}
