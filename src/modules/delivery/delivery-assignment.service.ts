import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DeliveryAssignmentStatus,
  DeliveryPartnerPreference,
} from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';

const ASSIGNMENT_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class DeliveryAssignmentRepository {
  constructor(
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly repo: Repository<DeliveryAssignmentEntity>,
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly partners: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
  ) {}

  findEligiblePartners(preference?: DeliveryPartnerPreference) {
    const qb = this.partners
      .createQueryBuilder('p')
      .where('p.is_online = :online', { online: true });

    if (preference === DeliveryPartnerPreference.STORE_ONLY) {
      qb.andWhere('p.preference IN (:...prefs)', {
        prefs: [
          DeliveryPartnerPreference.STORE_ONLY,
          DeliveryPartnerPreference.BOTH,
        ],
      });
    } else if (preference === DeliveryPartnerPreference.INDEPENDENT) {
      qb.andWhere('p.preference IN (:...prefs)', {
        prefs: [
          DeliveryPartnerPreference.INDEPENDENT,
          DeliveryPartnerPreference.BOTH,
        ],
      });
    }

    return qb.getMany();
  }

  createAssignment(data: Partial<DeliveryAssignmentEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['partnerProfile', 'subOrder'],
    });
  }

  findPendingForPartner(partnerProfileId: string) {
    return this.repo.find({
      where: { partnerProfileId, status: DeliveryAssignmentStatus.PENDING },
      relations: ['subOrder'],
    });
  }

  update(id: string, data: Partial<DeliveryAssignmentEntity>) {
    const { subOrder: _s, partnerProfile: _p, ...updateData } = data;
    void _s;
    void _p;
    return this.repo.update(id, updateData);
  }

  findTimedOutAssignments() {
    return this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: DeliveryAssignmentStatus.PENDING })
      .andWhere('a.timeout_at < :now', { now: new Date() })
      .getMany();
  }

  getSubOrder(id: string) {
    return this.subOrders.findOne({ where: { id } });
  }
}

@Injectable()
export class DeliveryAssignmentService {
  constructor(private readonly repo: DeliveryAssignmentRepository) {}

  findEligiblePartners(preference?: DeliveryPartnerPreference) {
    return this.repo.findEligiblePartners(preference);
  }

  async assign(subOrderId: string, partnerProfileId: string) {
    const subOrder = await this.repo.getSubOrder(subOrderId);
    if (!subOrder) {
      return null;
    }

    const timeoutAt = new Date(Date.now() + ASSIGNMENT_TIMEOUT_MS);

    const assignment = await this.repo.createAssignment({
      subOrderId,
      partnerProfileId,
      status: DeliveryAssignmentStatus.PENDING,
      assignedAt: new Date(),
      timeoutAt,
    });

    return assignment;
  }

  async accept(assignmentId: string, partnerProfileId: string) {
    const assignment = await this.repo.findById(assignmentId);
    if (!assignment || assignment.partnerProfileId !== partnerProfileId) {
      return null;
    }

    await this.repo.update(assignmentId, {
      status: DeliveryAssignmentStatus.ACCEPTED,
      acceptedAt: new Date(),
    });

    return this.repo.findById(assignmentId);
  }

  async reject(assignmentId: string, partnerProfileId: string) {
    const assignment = await this.repo.findById(assignmentId);
    if (!assignment || assignment.partnerProfileId !== partnerProfileId) {
      return null;
    }

    await this.repo.update(assignmentId, {
      status: DeliveryAssignmentStatus.REJECTED,
    });

    return this.repo.findById(assignmentId);
  }

  async processTimeouts() {
    const timedOut = await this.repo.findTimedOutAssignments();
    for (const assignment of timedOut) {
      await this.repo.update(assignment.id, {
        status: DeliveryAssignmentStatus.TIMEOUT,
      });
    }
    return timedOut.length;
  }

  listPendingForPartner(partnerProfileId: string) {
    return this.repo.findPendingForPartner(partnerProfileId);
  }
}
