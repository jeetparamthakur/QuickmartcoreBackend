import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  ActorType,
  ApprovalStatus,
  DeliveryAssignmentStatus,
  DeliveryPartnerPreference,
  KycDocumentType,
  KycStatus,
  SellerType,
  SubOrderStatus,
} from '../../common/enums';
import { KycSubmissionEntity } from '../kyc/entities/kyc-submission.entity';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CustomerAddressEntity } from '../customers/entities/customer-address.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { OrdersRepository } from '../orders/orders.service';
import { DeliveryAssignmentEntity } from './entities/delivery-assignment.entity';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { DeliveryPartnerProfileService } from './delivery-partner-profile.service';
import { KycService } from '../kyc/kyc.service';
import { StoresGeoService } from '../stores/stores-geo.service';
import { IndependentSellersGeoService } from '../independent-sellers/independent-sellers-geo.service';
import { subOrderMatchesPartner } from './delivery-partner-matching.util';
import { DeliveryPartnerPushService } from './delivery-partner-push.service';

const DELIVERY_PARTNER_DOC_TYPES = [
  KycDocumentType.AADHAAR,
  KycDocumentType.DRIVING_LICENSE,
  KycDocumentType.SELFIE,
];

const TRIP_STEPS = [
  'navigate_pickup',
  'confirm_pickup',
  'navigate_drop',
  'confirm_delivery',
  'completed',
] as const;

type TripStep = (typeof TRIP_STEPS)[number];

const ACTIVE_ASSIGNMENT_STATUSES = [
  DeliveryAssignmentStatus.PENDING,
  DeliveryAssignmentStatus.ACCEPTED,
  DeliveryAssignmentStatus.IN_PROGRESS,
];

type RequestFilters = {
  lat?: string;
  lng?: string;
  scope?: string;
  storeId?: string;
  sellerId?: string;
};

@Injectable()
export class DeliveryPartnerAppService {
  constructor(
    @InjectRepository(DeliveryPartnerProfileEntity)
    private readonly profiles: Repository<DeliveryPartnerProfileEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DeliveryAssignmentEntity)
    private readonly assignments: Repository<DeliveryAssignmentEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(CustomerAddressEntity)
    private readonly customerAddresses: Repository<CustomerAddressEntity>,
    @InjectRepository(KycSubmissionEntity)
    private readonly kycSubmissions: Repository<KycSubmissionEntity>,
    private readonly profileService: DeliveryPartnerProfileService,
    private readonly assignmentService: DeliveryAssignmentService,
    private readonly ordersRepo: OrdersRepository,
    private readonly kycService: KycService,
    private readonly storesGeo: StoresGeoService,
    private readonly sellersGeo: IndependentSellersGeoService,
    private readonly partnerPush: DeliveryPartnerPushService,
  ) {}

  async listNearbyStores(lat: number, lng: number, radiusKm = 15) {
    const capped = Math.min(Math.max(radiusKm, 1), 50);
    return this.storesGeo.findNearby(lat, lng, capped);
  }

  async listNearbySellers(lat: number, lng: number, radiusKm = 15) {
    const capped = Math.min(Math.max(radiusKm, 1), 50);
    return this.sellersGeo.findNearby(lat, lng, capped);
  }

  async getProfile(userId: string) {
    const profile = await this.requireProfile(userId);
    const user = await this.users.findOne({ where: { id: userId } });
    const kyc = await this.kycService.getStatus(userId);
    return this.toAppProfile(profile, user?.phone ?? '', kyc);
  }

  async updateProfile(
    userId: string,
    data: { name?: string; city?: string; vehicleType?: string },
  ) {
    const profile = await this.requireProfile(userId);
    if (data.name?.trim()) {
      profile.fullName = data.name.trim();
    }
    const details = { ...(profile.profileDetails ?? {}) };
    if (data.city?.trim()) details.city = data.city.trim();
    if (data.vehicleType) details.vehicleType = data.vehicleType;
    details.onboardingStep = 'kyc';
    profile.profileDetails = details;
    await this.profiles.save(profile);
    return this.getProfile(userId);
  }

  async completeOnboarding(
    userId: string,
    bankDetails: {
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
    },
  ) {
    const profile = await this.requireProfile(userId);
    const details = { ...(profile.profileDetails ?? {}) };
    details.bankDetails = {
      ...bankDetails,
      verificationStatus: 'pending',
    };
    details.onboardingStep = 'pending_approval';
    profile.profileDetails = details;
    profile.approvalStatus = ApprovalStatus.UNDER_REVIEW;
    await this.profiles.save(profile);

    const submission = await this.kycService.getOrCreateSubmission(userId);
    if (submission.status === KycStatus.PENDING) {
      submission.status = KycStatus.UNDER_REVIEW;
      submission.submittedAt = new Date();
      await this.kycSubmissions.save(submission);
    }

    return this.getProfile(userId);
  }

  async getKycStatus(userId: string) {
    const kyc = await this.kycService.getStatus(userId);
    return {
      status: kyc.status,
      rejectionReason: kyc.rejectionReason,
      documents: kyc.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        uri: doc.uri,
        uploadedAt: doc.uploadedAt,
      })),
    };
  }

  async uploadKycDocument(
    userId: string,
    type: string,
    file: Express.Multer.File,
  ) {
    const docType = type as KycDocumentType;
    if (!DELIVERY_PARTNER_DOC_TYPES.includes(docType)) {
      throw new BadRequestException('Invalid document type for delivery partner');
    }
    await this.kycService.uploadDocument(userId, docType, file);
    return this.getKycStatus(userId);
  }

  async getBankDetails(userId: string) {
    const profile = await this.requireProfile(userId);
    return profile.profileDetails?.bankDetails ?? null;
  }

  async getSession(partnerProfileId: string) {
    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    const details = profile.profileDetails ?? {};
    const scope =
      details.deliveryScope ??
      (profile.preference === DeliveryPartnerPreference.STORE_ONLY
        ? 'store'
        : profile.preference === DeliveryPartnerPreference.INDEPENDENT
          ? 'seller'
          : 'all_sellers');

    return {
      isOnline: profile.isOnline,
      preference: profile.preference,
      deliveryScope: scope,
      storeId: details.storeId ?? null,
      sellerId: details.sellerId ?? null,
    };
  }

  async updateDeliveryPreferences(
    partnerProfileId: string,
    prefs: { scope?: string; storeId?: string; sellerId?: string },
  ) {
    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    const details = { ...(profile.profileDetails ?? {}) };
    const record = details as Record<string, unknown>;
    if (prefs.scope) {
      details.deliveryScope = prefs.scope;
      if (prefs.scope === 'store') {
        profile.preference = DeliveryPartnerPreference.STORE_ONLY;
        delete record.sellerId;
      } else if (prefs.scope === 'seller') {
        profile.preference = DeliveryPartnerPreference.INDEPENDENT;
        delete record.storeId;
      } else {
        profile.preference = DeliveryPartnerPreference.BOTH;
        delete record.storeId;
        delete record.sellerId;
      }
    }
    if (prefs.storeId !== undefined) {
      details.storeId = prefs.storeId;
    }
    if (prefs.sellerId !== undefined) {
      details.sellerId = prefs.sellerId;
    }
    profile.profileDetails = details;
    await this.profiles.save(profile);
    return this.getSession(partnerProfileId);
  }

  async devApprovePartner(userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }

    const profile = await this.requireProfile(userId);
    profile.approvalStatus = ApprovalStatus.APPROVED;
    profile.profileDetails = {
      ...(profile.profileDetails ?? {}),
      onboardingStep: 'active',
    };
    await this.profiles.save(profile);

    const submission = await this.kycService.getOrCreateSubmission(userId);
    submission.status = KycStatus.APPROVED;
    submission.reviewedAt = new Date();
    submission.rejectionReason = null;
    await this.kycSubmissions.save(submission);

    return this.getProfile(userId);
  }

  async listRequests(
    _userId: string,
    partnerProfileId: string,
    filters: RequestFilters = {},
  ) {
    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    if (!profile.isOnline || profile.approvalStatus !== ApprovalStatus.APPROVED) {
      return [];
    }

    await this.offerReadyOrdersToPartner(profile, filters);

    const rows = await this.assignments.find({
      where: {
        partnerProfileId,
        status: DeliveryAssignmentStatus.PENDING,
      },
      relations: [
        'subOrder',
        'subOrder.store',
        'subOrder.items',
        'subOrder.parentOrder',
        'subOrder.parentOrder.customer',
      ],
      order: { assignedAt: 'DESC' },
    });

    const addressMap = await this.loadCustomerAddresses(rows);
    return rows
      .map((row) => this.toDeliveryRequest(row, addressMap))
      .filter((row) => this.matchesScope(row, filters, profile));
  }

  async getActiveTrip(partnerProfileId: string) {
    const active = await this.assignments.find({
      where: [
        {
          partnerProfileId,
          status: DeliveryAssignmentStatus.ACCEPTED,
        },
        {
          partnerProfileId,
          status: DeliveryAssignmentStatus.IN_PROGRESS,
        },
      ],
      relations: [
        'subOrder',
        'subOrder.store',
        'subOrder.items',
        'subOrder.parentOrder',
        'subOrder.parentOrder.customer',
      ],
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    const assignment = active[0];
    if (!assignment) return null;

    const profile = await this.profiles.findOne({
      where: { id: partnerProfileId },
    });
    const step =
      (profile?.profileDetails?.activeTripStep as TripStep | undefined) ??
      this.defaultTripStep(assignment);

    const addressMap = await this.loadCustomerAddresses([assignment]);
    return this.toActiveTrip(assignment, step, addressMap);
  }

  async acceptRequest(assignmentId: string, partnerProfileId: string) {
    const accepted = await this.assignmentService.accept(
      assignmentId,
      partnerProfileId,
    );
    if (!accepted) throw new NotFoundException('Request not found');

    await this.ordersRepo.updateSubOrderStatus(
      accepted.subOrderId,
      SubOrderStatus.DELIVERY_ASSIGNED,
      partnerProfileId,
      ActorType.DELIVERY_PARTNER,
    );

    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    profile.profileDetails = {
      ...(profile.profileDetails ?? {}),
      activeTripStep: 'navigate_pickup',
    };
    await this.profiles.save(profile);

    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: [
        'subOrder',
        'subOrder.store',
        'subOrder.items',
        'subOrder.parentOrder',
        'subOrder.parentOrder.customer',
      ],
    });
    if (!assignment) throw new NotFoundException('Request not found');
    const addressMap = await this.loadCustomerAddresses([assignment]);
    return this.toActiveTrip(assignment, 'navigate_pickup', addressMap);
  }

  async rejectRequest(assignmentId: string, partnerProfileId: string) {
    const rejected = await this.assignmentService.reject(
      assignmentId,
      partnerProfileId,
    );
    if (!rejected) throw new NotFoundException('Request not found');
    const assignment = await this.assignments.findOne({
      where: { id: assignmentId },
      relations: ['subOrder', 'subOrder.store', 'subOrder.items'],
    });
    if (!assignment) throw new NotFoundException('Request not found');
    const addressMap = await this.loadCustomerAddresses([assignment]);
    return this.toDeliveryRequest(assignment, addressMap);
  }

  async updateTripStatus(partnerProfileId: string, status: string) {
    const trip = await this.getActiveTrip(partnerProfileId);
    if (!trip) return null;

    const stepByStatus: Record<string, TripStep> = {
      navigate_pickup: 'navigate_pickup',
      confirm_pickup: 'confirm_pickup',
      navigate_drop: 'navigate_drop',
      confirm_delivery: 'confirm_delivery',
      picked_up: 'confirm_pickup',
      delivered: 'confirm_delivery',
    };
    const targetStep = stepByStatus[status];
    if (!targetStep) {
      return this.advanceTrip(partnerProfileId);
    }

    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    profile.profileDetails = {
      ...(profile.profileDetails ?? {}),
      activeTripStep: targetStep,
    };
    await this.profiles.save(profile);

    if (
      targetStep === 'confirm_pickup' ||
      targetStep === 'confirm_delivery'
    ) {
      return this.advanceTrip(partnerProfileId);
    }

    if (targetStep === 'navigate_drop') {
      await this.profileService.markOutForDelivery(
        trip.requestId,
        partnerProfileId,
      );
    }

    const assignment = await this.assignments.findOne({
      where: { id: trip.requestId, partnerProfileId },
      relations: [
        'subOrder',
        'subOrder.store',
        'subOrder.items',
        'subOrder.parentOrder',
        'subOrder.parentOrder.customer',
      ],
    });
    if (!assignment) return null;
    const addressMap = await this.loadCustomerAddresses([assignment]);
    return this.toActiveTrip(assignment, targetStep, addressMap);
  }

  async advanceTrip(partnerProfileId: string) {
    const trip = await this.getActiveTrip(partnerProfileId);
    if (!trip) return null;

    const profile = await this.requireProfileByPartnerId(partnerProfileId);
    const currentStep = trip.step as TripStep;
    const assignment = await this.assignments.findOne({
      where: { id: trip.requestId, partnerProfileId },
    });
    if (!assignment) return null;

    let nextStep: TripStep | null = null;

    switch (currentStep) {
      case 'navigate_pickup':
        nextStep = 'confirm_pickup';
        break;
      case 'confirm_pickup':
        await this.profileService.confirmPickup(trip.requestId, partnerProfileId);
        nextStep = 'navigate_drop';
        break;
      case 'navigate_drop':
        nextStep = 'confirm_delivery';
        break;
      case 'confirm_delivery':
        await this.profileService.confirmDelivery(trip.requestId, partnerProfileId);
        nextStep = 'completed';
        break;
      default:
        nextStep = null;
    }

    if (!nextStep || nextStep === 'completed') {
      profile.profileDetails = {
        ...(profile.profileDetails ?? {}),
        activeTripStep: undefined,
      };
      await this.profiles.save(profile);
      return null;
    }

    profile.profileDetails = {
      ...(profile.profileDetails ?? {}),
      activeTripStep: nextStep,
    };
    await this.profiles.save(profile);

    if (nextStep === 'navigate_drop') {
      await this.profileService.markOutForDelivery(
        assignment.id,
        partnerProfileId,
      );
    }

    const refreshed = await this.assignments.findOne({
      where: { id: assignment.id },
      relations: [
        'subOrder',
        'subOrder.store',
        'subOrder.items',
        'subOrder.parentOrder',
        'subOrder.parentOrder.customer',
      ],
    });
    if (!refreshed) return null;
    const addressMap = await this.loadCustomerAddresses([refreshed]);
    return this.toActiveTrip(refreshed, nextStep, addressMap);
  }

  async getEarnings(partnerProfileId: string) {
    const raw = await this.profileService.getEarnings(partnerProfileId);
    const total = Number(raw.totalEarnings ?? 0);
    const today = Number(raw.todayEarnings ?? 0);
    return {
      today,
      week: total,
      month: total,
      total,
      pendingSettlement: 0,
      availableBalance: total,
      nextSettlement: 0,
      nextSettlementDate: new Date(Date.now() + 3 * 86400000)
        .toISOString()
        .slice(0, 10),
    };
  }

  async registerDevice(userId: string, pushToken: string) {
    const profile = await this.requireProfile(userId);
    profile.profileDetails = {
      ...(profile.profileDetails ?? {}),
      pushToken,
    };
    await this.profiles.save(profile);
    return { success: true };
  }

  private async offerReadyOrdersToPartner(
    profile: DeliveryPartnerProfileEntity,
    filters: RequestFilters,
  ) {
    const openSubOrders = await this.subOrders
      .createQueryBuilder('so')
      .leftJoin(
        DeliveryAssignmentEntity,
        'da',
        'da.sub_order_id = so.id AND da.status IN (:...activeStatuses)',
        { activeStatuses: ACTIVE_ASSIGNMENT_STATUSES },
      )
      .where('so.status = :ready', {
        ready: SubOrderStatus.READY_FOR_PICKUP,
      })
      .andWhere('da.id IS NULL')
      .orderBy('so.createdAt', 'ASC')
      .take(15)
      .getMany();

    const eligible = openSubOrders.filter((subOrder) =>
      subOrderMatchesPartner(subOrder, profile, filters),
    );

    const existingPending = await this.assignments.count({
      where: {
        partnerProfileId: profile.id,
        status: DeliveryAssignmentStatus.PENDING,
      },
    });

    const slots = Math.max(0, 5 - existingPending);
    for (const subOrder of eligible.slice(0, slots)) {
      const assignment = await this.assignmentService.assign(
        subOrder.id,
        profile.id,
      );
      if (assignment) {
        void this.partnerPush
          .notifyPartnerAssignment(profile.id, subOrder.id, assignment.id)
          .catch(() => undefined);
      }
    }
  }

  private matchesScope(
    request: { sellerType: string; storeId?: string; sellerId?: string },
    filters: RequestFilters,
    profile: DeliveryPartnerProfileEntity,
  ) {
    const details = profile.profileDetails ?? {};
    const scope = filters.scope ?? details.deliveryScope;
    if (scope === 'store' && request.sellerType !== 'STORE') {
      return false;
    }
    if (scope === 'seller' && request.sellerType !== 'INDEPENDENT_SELLER') {
      return false;
    }
    const storeId = filters.storeId ?? details.storeId;
    if (storeId && request.storeId !== storeId) {
      return false;
    }
    const sellerId = filters.sellerId ?? details.sellerId;
    if (sellerId && request.sellerId !== sellerId) {
      return false;
    }
    return true;
  }

  private async loadCustomerAddresses(
    assignments: DeliveryAssignmentEntity[],
  ) {
    const customerIds = assignments
      .map((a) => a.subOrder?.parentOrder?.customerId)
      .filter((id): id is string => Boolean(id));

    if (!customerIds.length) return new Map<string, CustomerAddressEntity>();

    const addresses = await this.customerAddresses.find({
      where: { customerId: In(customerIds) },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    const map = new Map<string, CustomerAddressEntity>();
    for (const address of addresses) {
      if (!map.has(address.customerId)) {
        map.set(address.customerId, address);
      }
    }
    return map;
  }

  private async requireProfile(userId: string) {
    const profile = await this.profiles.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    return profile;
  }

  private async requireProfileByPartnerId(partnerProfileId: string) {
    const profile = await this.profiles.findOne({
      where: { id: partnerProfileId },
    });
    if (!profile) {
      throw new NotFoundException('Delivery partner profile not found');
    }
    return profile;
  }

  private defaultTripStep(assignment: DeliveryAssignmentEntity): TripStep {
    if (assignment.status === DeliveryAssignmentStatus.IN_PROGRESS) {
      return 'navigate_drop';
    }
    return 'navigate_pickup';
  }

  private async toAppProfile(
    profile: DeliveryPartnerProfileEntity,
    phone: string,
    kyc: { status: KycStatus; documents: { type: string }[] },
  ) {
    const details = profile.profileDetails ?? {};
    const onboardingStep =
      details.onboardingStep ??
      this.deriveOnboardingStep(profile, kyc.documents);

    const approvalStatus = profile.approvalStatus;
    const canGoOnline = approvalStatus === ApprovalStatus.APPROVED;
    const resolvedOnboarding =
      canGoOnline && onboardingStep === 'pending_approval'
        ? 'active'
        : onboardingStep;

    return {
      id: profile.id,
      name: profile.fullName,
      phone,
      city: details.city ?? '',
      vehicleType: details.vehicleType ?? 'bike',
      onboardingStep: resolvedOnboarding,
      approvalStatus,
      canGoOnline,
    };
  }

  private deriveOnboardingStep(
    profile: DeliveryPartnerProfileEntity,
    documents: { type: string }[],
  ) {
    const details = profile.profileDetails ?? {};
    if (!profile.fullName?.trim() || !details.city) return 'profile';

    const uploaded = new Set(documents.map((d) => d.type));
    const kycComplete = DELIVERY_PARTNER_DOC_TYPES.every((t) =>
      uploaded.has(t),
    );
    if (!kycComplete) return 'kyc';
    if (!details.bankDetails) return 'bank';

    if (
      profile.approvalStatus === ApprovalStatus.PENDING ||
      profile.approvalStatus === ApprovalStatus.UNDER_REVIEW
    ) {
      return 'pending_approval';
    }

    if (profile.approvalStatus === ApprovalStatus.REJECTED) {
      return 'pending_approval';
    }

    return 'active';
  }

  private toDeliveryRequest(
    assignment: DeliveryAssignmentEntity,
    addressMap: Map<string, CustomerAddressEntity>,
  ) {
    const subOrder = assignment.subOrder;
    const store = subOrder?.store;
    const pickupLat = Number(store?.lat ?? 28.6139);
    const pickupLng = Number(store?.lng ?? 77.209);
    const customerId = subOrder?.parentOrder?.customerId;
    const delivery = customerId ? addressMap.get(customerId) : undefined;
    const customerProfile = subOrder?.parentOrder?.customer;
    const customerLat = Number(delivery?.lat ?? pickupLat + 0.01);
    const customerLng = Number(delivery?.lng ?? pickupLng + 0.01);

    return {
      id: assignment.id,
      orderId: subOrder?.id ?? assignment.subOrderId,
      orderNumber: subOrder?.orderNumber ?? assignment.subOrderId.slice(0, 8),
      storeId: subOrder?.storeId ?? undefined,
      sellerId: subOrder?.storeId ?? subOrder?.independentSellerId ?? '',
      sellerType:
        subOrder?.sellerType === SellerType.STORE ? 'STORE' : 'INDEPENDENT_SELLER',
      pickupAddress: store?.address ?? 'Pickup location',
      pickupLatitude: pickupLat,
      pickupLongitude: pickupLng,
      customerAddress:
        delivery?.fullAddress ??
        customerProfile?.address ??
        'Customer delivery address',
      customerLatitude: customerLat,
      customerLongitude: customerLng,
      partnerPickupRadiusKm: Number(store?.serviceRadiusKm ?? 5),
      status: this.mapAssignmentStatus(assignment.status),
      orderTotal: Number(subOrder?.subtotal ?? 0),
      deliveryFee: Number(subOrder?.deliveryFee ?? 0),
      itemCount: subOrder?.items?.length ?? 0,
      createdAt: assignment.createdAt.toISOString(),
    };
  }

  private toActiveTrip(
    assignment: DeliveryAssignmentEntity,
    step: TripStep,
    addressMap: Map<string, CustomerAddressEntity>,
  ) {
    const base = this.toDeliveryRequest(assignment, addressMap);
    return {
      requestId: assignment.id,
      orderId: base.orderId,
      orderNumber: base.orderNumber,
      status: base.status,
      pickupAddress: base.pickupAddress,
      pickupLatitude: base.pickupLatitude,
      pickupLongitude: base.pickupLongitude,
      customerAddress: base.customerAddress,
      customerLatitude: base.customerLatitude,
      customerLongitude: base.customerLongitude,
      deliveryFee: base.deliveryFee,
      itemCount: base.itemCount,
      step,
    };
  }

  private mapAssignmentStatus(status: DeliveryAssignmentStatus) {
    switch (status) {
      case DeliveryAssignmentStatus.PENDING:
        return 'requested';
      case DeliveryAssignmentStatus.ACCEPTED:
        return 'accepted';
      case DeliveryAssignmentStatus.REJECTED:
        return 'rejected';
      case DeliveryAssignmentStatus.IN_PROGRESS:
        return 'picked_up';
      case DeliveryAssignmentStatus.COMPLETED:
        return 'delivered';
      default:
        return 'requested';
    }
  }
}
