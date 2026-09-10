import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  UserType,
  SubOrderStatus,
  ActorType,
  PayoutStatus,
  SellerType,
  WalletOwnerType,
  PartnerType,
  StoreStatus,
  CommissionRuleType,
} from '../../common/enums';
import { InventoryRepository } from '../inventory/inventory.service';
import { SellerProductEntity } from '../products/entities/seller-product.entity';
import { SellerProfileEntity } from '../sellers/entities/seller-profile.entity';
import { StoreOwnerProfileEntity } from '../stores/entities/store-owner-profile.entity';
import { StoreEntity } from '../stores/entities/store.entity';
import { IndependentSellerEntity } from '../independent-sellers/entities/independent-seller.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { OrdersRepository } from '../orders/orders.service';
import { OrderStateMachineService } from '../orders/order-state-machine.service';
import { ProductsRepository } from '../products/products.repository';
import { CategoriesRepository } from '../categories/categories.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { KycService } from '../kyc/kyc.service';
import { PayoutEntity } from '../payouts/entities/payout.entity';
import { WalletService } from '../wallet/wallet.service';
import { CommissionService } from '../commission/commission.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { CreateSellerProductDto } from './dto/create-seller-product.dto';
import { UpdateSellerProductDto } from './dto/update-seller-product.dto';

const LOW_STOCK_THRESHOLD = 5;

const STATUS_ACTIONS: Partial<Record<SubOrderStatus, string[]>> = {
  [SubOrderStatus.PLACED]: ['ACCEPT', 'REJECT'],
  [SubOrderStatus.ACCEPTED]: ['START_PREPARING'],
  [SubOrderStatus.PREPARING]: ['SET_READY_TIME', 'MARK_READY'],
  [SubOrderStatus.READY_FOR_PICKUP]: ['MARK_READY'],
};

@Injectable()
export class SellerService {
  constructor(
    @InjectRepository(SellerProfileEntity)
    private readonly sellerProfiles: Repository<SellerProfileEntity>,
    @InjectRepository(StoreOwnerProfileEntity)
    private readonly storeOwnerProfiles: Repository<StoreOwnerProfileEntity>,
    @InjectRepository(StoreEntity)
    private readonly stores: Repository<StoreEntity>,
    @InjectRepository(IndependentSellerEntity)
    private readonly independentSellers: Repository<IndependentSellerEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(PayoutEntity)
    private readonly payouts: Repository<PayoutEntity>,
    private readonly ordersRepo: OrdersRepository,
    private readonly stateMachine: OrderStateMachineService,
    private readonly productsRepo: ProductsRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly categoriesRepo: CategoriesRepository,
    private readonly notificationsService: NotificationsService,
    private readonly kycService: KycService,
    private readonly walletService: WalletService,
    private readonly commissionService: CommissionService,
  ) {}

  async getProfile(userId: string, userType: UserType) {
    return this.kycService.buildPartnerResponse(userId, userType);
  }

  async getProfileLegacy(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      const profile = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      if (!profile)
        throw new NotFoundException('Store owner profile not found');
      const stores = await this.stores.find({
        where: { storeOwnerId: profile.id },
      });
      return { profile, stores, userType };
    }
    const profile = await this.sellerProfiles.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Seller profile not found');
    const independent = await this.independentSellers.findOne({
      where: { sellerProfileId: profile.id },
    });
    return { profile, independent, userType };
  }

  async listOrders(userId: string, userType: UserType, storeId?: string) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.items', 'items')
      .leftJoinAndSelect('so.store', 'store')
      .orderBy('so.created_at', 'DESC');

    if (userType === UserType.STORE_OWNER) {
      if (!storeId) {
        throw new BadRequestException('storeId is required');
      }
      await this.assertStoreAccess(userId, userType, storeId);
      qb.where('so.store_id = :storeId', { storeId });
    } else {
      const seller = await this.sellerProfiles.findOne({ where: { userId } });
      if (!seller) return [];

      if (seller.partnerType === PartnerType.STORE) {
        if (!storeId) {
          throw new BadRequestException('storeId is required');
        }
        await this.assertStoreAccess(userId, userType, storeId);
        qb.where('so.store_id = :storeId', { storeId });
      } else {
        const ind = await this.independentSellers.findOne({
          where: { sellerProfileId: seller.id },
        });
        if (!ind) return [];
        qb.where('so.independent_seller_id = :id', { id: ind.id });
      }
    }

    const orders = await qb.getMany();
    return orders.map((o) => this.formatSubOrder(o));
  }

  async getOrder(userId: string, userType: UserType, orderId: string) {
    const order = await this.subOrders.findOne({
      where: { id: orderId },
      relations: ['items', 'store', 'independentSeller'],
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(userId, userType, order);
    return this.formatSubOrder(order);
  }

  async transitionOrder(
    userId: string,
    userType: UserType,
    orderId: string,
    action: string,
    _metadata?: Record<string, unknown>,
  ) {
    void _metadata;
    const order = await this.subOrders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertOrderAccess(userId, userType, order);

    const actorType =
      userType === UserType.STORE_OWNER
        ? ActorType.STORE_OWNER
        : ActorType.SELLER;

    let toStatus: SubOrderStatus;
    switch (action) {
      case 'ACCEPT':
        toStatus = SubOrderStatus.ACCEPTED;
        break;
      case 'REJECT':
        toStatus = SubOrderStatus.REJECTED;
        break;
      case 'START_PREPARING':
        toStatus = SubOrderStatus.PREPARING;
        break;
      case 'MARK_READY':
        toStatus = SubOrderStatus.READY_FOR_PICKUP;
        break;
      default:
        throw new NotFoundException('Unknown action');
    }

    this.stateMachine.assertTransition(order.status, toStatus);
    const updated = await this.ordersRepo.updateSubOrderStatus(
      orderId,
      toStatus,
      userId,
      actorType,
    );
    return this.formatSubOrder(updated!);
  }

  async listInventory(userId: string, userType: UserType, storeId?: string) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (owner && !storeId) {
      throw new BadRequestException('storeId is required');
    }
    const products = await this.listProducts(userId, userType, storeId);
    return products.map((product) => ({
      id: product.id,
      productId: product.id,
      storeId: product.storeId,
      productName: product.name,
      available: product.quantity,
      lowStockThreshold: product.lowStockThreshold ?? LOW_STOCK_THRESHOLD,
      stockStatus: product.stockStatus,
    }));
  }

  async updateInventory(
    userId: string,
    userType: UserType,
    productId: string,
    quantity: number,
    storeId?: string,
  ) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (owner && !storeId) {
      throw new BadRequestException('storeId is required');
    }
    await this.assertProductAccess(userId, userType, productId, storeId);
    await this.inventoryRepo.upsertQuantity(productId, quantity);
    return { success: true };
  }

  async listProducts(userId: string, userType: UserType, storeId?: string) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (owner) {
      if (!storeId) {
        throw new BadRequestException('storeId is required');
      }
      await this.assertStoreAccess(userId, userType, storeId);
      const products = await this.productsRepo.findByStoreId(storeId);
      return products.map((product) =>
        this.mapSellerProductToAppResponse(product),
      );
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) return [];
    const ind = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (!ind) return [];
    const products = await this.productsRepo.findByIndependentSellerId(ind.id);
    return products.map((product) =>
      this.mapSellerProductToAppResponse(product),
    );
  }

  async getProduct(
    userId: string,
    userType: UserType,
    productId: string,
    storeId?: string,
  ) {
    const product = await this.assertProductAccess(
      userId,
      userType,
      productId,
      storeId,
    );
    return this.mapSellerProductToAppResponse(product);
  }

  async createProduct(
    userId: string,
    userType: UserType,
    dto: CreateSellerProductDto,
  ) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    let sellerType: SellerType;
    let storeId: string | null = null;
    let independentSellerId: string | null = null;

    if (owner) {
      if (!dto.storeId) {
        throw new BadRequestException('storeId is required');
      }
      await this.assertStoreAccess(userId, userType, dto.storeId);
      sellerType = SellerType.STORE;
      storeId = dto.storeId;
    } else {
      if (dto.storeId) {
        throw new BadRequestException(
          'storeId is not allowed for independent seller products',
        );
      }
      const { independent } = await this.requireIndependentSeller(userId);
      sellerType = SellerType.INDEPENDENT;
      independentSellerId = independent.id;
    }

    const categoryId = await this.resolveProductCategoryId(
      dto.categoryId,
      dto.category,
    );
    const baseUnit = dto.customUnit?.trim() || dto.unitType?.trim() || 'pcs';
    let status = dto.status?.trim() || 'pending_review';
    if (sellerType === SellerType.INDEPENDENT && status !== 'draft') {
      status = 'active';
    }
    const isActive = status !== 'draft' && status !== 'rejected';

    const masterProduct = await this.productsRepo.createMasterProduct({
      categoryId,
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      brand: dto.brand?.trim() || null,
      baseUnit,
      attributes: {
        images: dto.images ?? [],
        sku: dto.sku?.trim() || `SKU-${Date.now()}`,
        status,
        categoryLabel: dto.category?.trim() || 'General',
        frontendCategoryId: dto.categoryId ?? null,
        lowStockThreshold: dto.lowStockThreshold ?? LOW_STOCK_THRESHOLD,
        packageSize: dto.packageSize ?? 1,
        purchasePrice: dto.purchasePrice ?? 0,
        pricePerUnit: dto.pricePerUnit ?? 0,
        marginAmount: dto.marginAmount ?? 0,
        marginPercent: dto.marginPercent ?? 0,
        discountPercent: dto.discountPercent ?? 0,
        customUnit: dto.customUnit ?? null,
        unitType: dto.unitType ?? baseUnit,
      },
    });

    const sellerProduct = await this.productsRepo.createSellerProduct({
      sellerType,
      storeId,
      independentSellerId,
      masterProductId: masterProduct.id,
      title: dto.name.trim(),
      mrp: dto.mrp.toFixed(2),
      sellingPrice: dto.sellingPrice.toFixed(2),
      isActive,
    });

    await this.inventoryRepo.upsertQuantity(
      sellerProduct.id,
      dto.quantity ?? 0,
    );

    const saved = await this.productsRepo.findSellerProductByIdForAccess(
      sellerProduct.id,
    );
    if (!saved) {
      throw new NotFoundException('Product not found after creation');
    }

    if (sellerType === SellerType.INDEPENDENT && status === 'active') {
      await this.notifyAdminsIndependentProductListed(saved, userId);
    }

    return this.mapSellerProductToAppResponse(saved);
  }

  async updateProduct(
    userId: string,
    userType: UserType,
    productId: string,
    dto: UpdateSellerProductDto,
    storeId?: string,
  ) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner && dto.storeId) {
      throw new BadRequestException(
        'storeId is not allowed for independent seller products',
      );
    }

    const product = await this.assertProductAccess(
      userId,
      userType,
      productId,
      storeId,
    );
    const master = product.masterProduct;
    if (!master) {
      throw new NotFoundException('Product not found');
    }

    const currentAttrs = master.attributes ?? {};
    if (currentAttrs.status === 'rejected') {
      throw new BadRequestException(
        'Rejected products cannot be edited. Please create a new listing.',
      );
    }
    if (dto.status === 'active' && currentAttrs.status === 'rejected') {
      throw new BadRequestException(
        'Rejected products cannot be reactivated by sellers',
      );
    }

    const attrs = { ...currentAttrs };
    if (dto.images !== undefined) attrs.images = dto.images;
    if (dto.sku !== undefined) attrs.sku = dto.sku.trim();
    if (dto.status !== undefined) attrs.status = dto.status.trim();
    if (dto.category !== undefined) attrs.categoryLabel = dto.category.trim();
    if (dto.categoryId !== undefined) attrs.frontendCategoryId = dto.categoryId;
    if (dto.lowStockThreshold !== undefined)
      attrs.lowStockThreshold = dto.lowStockThreshold;
    if (dto.packageSize !== undefined) attrs.packageSize = dto.packageSize;
    if (dto.purchasePrice !== undefined)
      attrs.purchasePrice = dto.purchasePrice;
    if (dto.pricePerUnit !== undefined) attrs.pricePerUnit = dto.pricePerUnit;
    if (dto.marginAmount !== undefined) attrs.marginAmount = dto.marginAmount;
    if (dto.marginPercent !== undefined)
      attrs.marginPercent = dto.marginPercent;
    if (dto.discountPercent !== undefined)
      attrs.discountPercent = dto.discountPercent;
    if (dto.customUnit !== undefined) attrs.customUnit = dto.customUnit;
    if (dto.unitType !== undefined) attrs.unitType = dto.unitType;

    const nextStatus = dto.status?.trim();
    if (dto.name !== undefined) master.name = dto.name.trim();
    if (dto.description !== undefined)
      master.description = dto.description.trim();
    if (dto.brand !== undefined) master.brand = dto.brand.trim() || null;
    if (dto.unitType !== undefined || dto.customUnit !== undefined) {
      master.baseUnit =
        dto.customUnit?.trim() || dto.unitType?.trim() || master.baseUnit;
    }
    master.attributes = attrs;
    await this.productsRepo.saveMasterProduct(master);

    const sellerPatch: Partial<
      Pick<SellerProductEntity, 'title' | 'mrp' | 'sellingPrice' | 'isActive'>
    > = {};
    if (dto.name !== undefined) sellerPatch.title = dto.name.trim();
    if (dto.mrp !== undefined) sellerPatch.mrp = dto.mrp.toFixed(2);
    if (dto.sellingPrice !== undefined)
      sellerPatch.sellingPrice = dto.sellingPrice.toFixed(2);
    if (nextStatus !== undefined) sellerPatch.isActive = nextStatus !== 'draft';
    if (Object.keys(sellerPatch).length > 0) {
      await this.productsRepo.updateSellerProduct(product.id, sellerPatch);
    }

    if (dto.quantity !== undefined) {
      await this.inventoryRepo.upsertQuantity(product.id, dto.quantity);
    }

    const saved = await this.productsRepo.findSellerProductByIdForAccess(
      product.id,
    );
    if (!saved) {
      throw new NotFoundException('Product not found after update');
    }
    return this.mapSellerProductToAppResponse(saved);
  }

  async deleteProduct(
    userId: string,
    userType: UserType,
    productId: string,
    storeId?: string,
  ) {
    const product = await this.assertProductAccess(
      userId,
      userType,
      productId,
      storeId,
    );
    await this.productsRepo.softDeleteSellerProduct(product.id);
    return { success: true };
  }

  async listStores(userId: string, userType: UserType) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) return [];

    const storeRows = await this.stores.find({
      where: { storeOwnerId: owner.id },
    });
    return storeRows.map((store) => this.mapStoreToResponse(store, owner));
  }

  async getStore(userId: string, userType: UserType, storeId: string) {
    const store = await this.assertStoreAccess(userId, userType, storeId);
    const owner = await this.storeOwnerProfiles.findOne({
      where: { id: store.storeOwnerId },
    });
    if (!owner) throw new NotFoundException('Store not found');
    return this.mapStoreToResponse(store, owner);
  }

  async createStore(userId: string, userType: UserType, dto: CreateStoreDto) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) {
      throw new BadRequestException('Only store partners can create stores');
    }

    const details = this.buildStoreDetails(dto);
    const store = await this.stores.save(
      this.stores.create({
        storeOwnerId: owner.id,
        name: dto.name.trim(),
        address: this.formatAddress(details) ?? dto.address.trim(),
        lat: String(dto.latitude),
        lng: String(dto.longitude),
        serviceRadiusKm: String(dto.deliveryRadius ?? 5),
        details,
        status: StoreStatus.ACTIVE,
      }),
    );

    return this.mapStoreToResponse(store, owner);
  }

  async updateStore(
    userId: string,
    userType: UserType,
    storeId: string,
    dto: UpdateStoreDto,
  ) {
    const store = await this.assertStoreAccess(userId, userType, storeId);
    const owner = await this.storeOwnerProfiles.findOne({
      where: { id: store.storeOwnerId },
    });
    if (!owner) throw new NotFoundException('Store not found');

    const currentDetails = (store.details ?? {}) as Record<string, unknown>;
    const nextDetails = {
      ...currentDetails,
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.area !== undefined ? { area: dto.area } : {}),
      ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
      ...(dto.openingTime !== undefined
        ? { openingTime: dto.openingTime }
        : {}),
      ...(dto.closingTime !== undefined
        ? { closingTime: dto.closingTime }
        : {}),
      ...(dto.is24Hours !== undefined ? { is24Hours: dto.is24Hours } : {}),
      ...(dto.partnerPickupRadiusKm !== undefined
        ? { partnerPickupRadiusKm: dto.partnerPickupRadiusKm }
        : {}),
      ...(dto.platformDeliveryEnabled !== undefined
        ? { platformDeliveryEnabled: dto.platformDeliveryEnabled }
        : {}),
      ...(dto.contactNumber !== undefined
        ? { contactNumber: dto.contactNumber }
        : {}),
    };

    if (dto.name !== undefined) store.name = dto.name.trim();
    if (
      dto.address !== undefined ||
      dto.city !== undefined ||
      dto.area !== undefined ||
      dto.pincode !== undefined
    ) {
      store.address =
        this.formatAddress({
          ...nextDetails,
          address: dto.address ?? this.readString(currentDetails, 'address'),
        }) ?? store.address;
    }
    if (dto.latitude !== undefined) store.lat = String(dto.latitude);
    if (dto.longitude !== undefined) store.lng = String(dto.longitude);
    if (dto.deliveryRadius !== undefined)
      store.serviceRadiusKm = String(dto.deliveryRadius);
    if (dto.isOpen !== undefined) {
      store.status = dto.isOpen ? StoreStatus.ACTIVE : StoreStatus.INACTIVE;
    }
    store.details = nextDetails;

    const saved = await this.stores.save(store);
    return this.mapStoreToResponse(saved, owner);
  }

  async getEarnings(userId: string, userType: UserType, storeId?: string) {
    const scope = await this.resolveSellerScope(userId, userType, storeId);
    if (!scope) {
      return this.emptyEarningsSummary();
    }

    const startOfToday = this.startOfUtcDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 6);
    const startOfMonth = new Date(
      Date.UTC(startOfToday.getUTCFullYear(), startOfToday.getUTCMonth(), 1),
    );

    const [today, week, month, total, grossTotal, commissionTotal] =
      await Promise.all([
        this.sumEarnings(scope, startOfToday),
        this.sumEarnings(scope, startOfWeek),
        this.sumEarnings(scope, startOfMonth),
        this.sumEarnings(scope),
        this.sumGrossSales(scope),
        this.sumCommissionDeductions(scope),
      ]);

    const targetId = scope.storeIds?.[0] ?? scope.independentSellerId;
    const [currentCommission, scheduledCommission] = await Promise.all([
      this.commissionService.getCurrentRateForSeller(
        scope.beneficiaryType,
        targetId,
      ),
      this.commissionService.getScheduledChangeForSeller(
        scope.beneficiaryType,
        targetId,
      ),
    ]);

    const wallet = await this.walletService
      .getWallet(userId, WalletOwnerType.SELLER)
      .catch(() => null);
    const availableBalance = wallet ? parseFloat(wallet.balance) : 0;

    const pendingPayouts = await this.payouts.find({
      where: {
        beneficiaryId: scope.beneficiaryId,
        beneficiaryType: scope.beneficiaryType,
        status: PayoutStatus.PENDING,
      },
    });
    const pendingSettlement = pendingPayouts.reduce(
      (sum, payout) => sum + parseFloat(payout.amount),
      0,
    );

    const nextPayout = await this.payouts.findOne({
      where: {
        beneficiaryId: scope.beneficiaryId,
        beneficiaryType: scope.beneficiaryType,
        status: PayoutStatus.PENDING,
      },
      order: { createdAt: 'ASC' },
    });

    return {
      today,
      week,
      month,
      total,
      grossTotal,
      commissionTotal,
      commissionRate:
        currentCommission?.type === CommissionRuleType.PERCENTAGE
          ? currentCommission.rate
          : null,
      commissionType: currentCommission?.type ?? null,
      commissionLabel: currentCommission?.ruleName ?? null,
      scheduledCommission: scheduledCommission
        ? {
            rate: scheduledCommission.rate,
            type: scheduledCommission.type,
            effectiveFrom: scheduledCommission.effectiveFrom,
            ruleName: scheduledCommission.ruleName,
          }
        : null,
      pendingSettlement,
      availableBalance,
      nextSettlement: nextPayout
        ? parseFloat(nextPayout.amount)
        : pendingSettlement,
      nextSettlementDate: this.getNextSettlementDate(),
    };
  }

  private async resolveSellerScope(
    userId: string,
    userType: UserType,
    storeId?: string,
  ) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (owner) {
      if (!storeId) {
        throw new BadRequestException('storeId is required');
      }
      await this.assertStoreAccess(userId, userType, storeId);
      return {
        storeIds: [storeId],
        beneficiaryId: owner.id,
        beneficiaryType: SellerType.STORE,
      };
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) return null;
    const independent = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (!independent) return null;
    return {
      independentSellerId: independent.id,
      beneficiaryId: independent.id,
      beneficiaryType: SellerType.INDEPENDENT,
    };
  }

  private async sumEarnings(
    scope: {
      storeIds?: string[];
      independentSellerId?: string;
    },
    since?: Date,
  ) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .select(
        'COALESCE(SUM(CAST(so.subtotal AS DECIMAL) - CAST(so.commission_amount AS DECIMAL)), 0)',
        'total',
      )
      .where('so.status = :status', { status: SubOrderStatus.DELIVERED });

    if (scope.storeIds?.length) {
      qb.andWhere('so.store_id IN (:...storeIds)', {
        storeIds: scope.storeIds,
      });
    } else if (scope.independentSellerId) {
      qb.andWhere('so.independent_seller_id = :id', {
        id: scope.independentSellerId,
      });
    } else {
      return 0;
    }

    if (since) {
      qb.andWhere('so.created_at >= :since', { since });
    }

    const result = await qb.getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }

  private async sumGrossSales(
    scope: {
      storeIds?: string[];
      independentSellerId?: string;
    },
    since?: Date,
  ) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .select('COALESCE(SUM(CAST(so.subtotal AS DECIMAL)), 0)', 'total')
      .where('so.status = :status', { status: SubOrderStatus.DELIVERED });

    if (scope.storeIds?.length) {
      qb.andWhere('so.store_id IN (:...storeIds)', {
        storeIds: scope.storeIds,
      });
    } else if (scope.independentSellerId) {
      qb.andWhere('so.independent_seller_id = :id', {
        id: scope.independentSellerId,
      });
    } else {
      return 0;
    }

    if (since) {
      qb.andWhere('so.created_at >= :since', { since });
    }

    const result = await qb.getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }

  private async sumCommissionDeductions(
    scope: {
      storeIds?: string[];
      independentSellerId?: string;
    },
    since?: Date,
  ) {
    const qb = this.subOrders
      .createQueryBuilder('so')
      .select(
        'COALESCE(SUM(CAST(so.commission_amount AS DECIMAL)), 0)',
        'total',
      )
      .where('so.status = :status', { status: SubOrderStatus.DELIVERED });

    if (scope.storeIds?.length) {
      qb.andWhere('so.store_id IN (:...storeIds)', {
        storeIds: scope.storeIds,
      });
    } else if (scope.independentSellerId) {
      qb.andWhere('so.independent_seller_id = :id', {
        id: scope.independentSellerId,
      });
    } else {
      return 0;
    }

    if (since) {
      qb.andWhere('so.created_at >= :since', { since });
    }

    const result = await qb.getRawOne<{ total: string }>();
    return parseFloat(result?.total ?? '0');
  }

  private emptyEarningsSummary() {
    return {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      grossTotal: 0,
      commissionTotal: 0,
      commissionRate: null,
      commissionType: null,
      commissionLabel: null,
      scheduledCommission: null,
      pendingSettlement: 0,
      availableBalance: 0,
      nextSettlement: 0,
      nextSettlementDate: this.getNextSettlementDate(),
    };
  }

  private startOfUtcDay(date = new Date()) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private getNextSettlementDate() {
    const date = new Date();
    const daysUntilTuesday = (2 - date.getUTCDay() + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + daysUntilTuesday);
    return date.toISOString().slice(0, 10);
  }

  private async assertOrderAccess(
    userId: string,
    userType: UserType,
    order: SubOrderEntity,
  ) {
    if (userType === UserType.STORE_OWNER) {
      const owner = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      const store = order.storeId
        ? await this.stores.findOne({ where: { id: order.storeId } })
        : null;
      if (!owner || !store || store.storeOwnerId !== owner.id) {
        throw new NotFoundException('Order not found');
      }
      return;
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType === PartnerType.STORE) {
      const owner = await this.storeOwnerProfiles.findOne({
        where: { userId },
      });
      const store = order.storeId
        ? await this.stores.findOne({ where: { id: order.storeId } })
        : null;
      if (!owner || !store || store.storeOwnerId !== owner.id) {
        throw new NotFoundException('Order not found');
      }
      return;
    }

    const ind = seller
      ? await this.independentSellers.findOne({
          where: { sellerProfileId: seller.id },
        })
      : null;
    if (!ind || order.independentSellerId !== ind.id) {
      throw new NotFoundException('Order not found');
    }
  }

  private formatSubOrder(order: SubOrderEntity) {
    return {
      ...order,
      allowedActions: STATUS_ACTIONS[order.status] ?? [],
    };
  }

  private computeStockStatus(available: number, threshold: number) {
    if (available <= 0) return 'out_of_stock';
    if (available <= threshold) return 'low_stock';
    return 'in_stock';
  }

  private mapSellerProductToAppResponse(product: SellerProductEntity) {
    const master = product.masterProduct;
    const attrs = master?.attributes ?? {};
    const available = product.inventory?.quantityAvailable ?? 0;
    const reserved = product.inventory?.quantityReserved ?? 0;
    const quantity = Math.max(available - reserved, 0);
    const lowStockThreshold = Number(
      attrs.lowStockThreshold ?? LOW_STOCK_THRESHOLD,
    );
    const mrp = parseFloat(product.mrp);
    const sellingPrice = parseFloat(product.sellingPrice);
    const storedStatus =
      typeof attrs.status === 'string' ? attrs.status : 'pending_review';
    const resolvedStatus =
      storedStatus === 'rejected'
        ? 'rejected'
        : product.isActive
          ? storedStatus
          : 'draft';

    return {
      id: product.id,
      name: master?.name ?? product.title,
      categoryId:
        typeof attrs.frontendCategoryId === 'string'
          ? attrs.frontendCategoryId
          : (master?.categoryId ?? ''),
      category:
        typeof attrs.categoryLabel === 'string'
          ? attrs.categoryLabel
          : 'General',
      brand: master?.brand ?? undefined,
      description: master?.description ?? '',
      images: Array.isArray(attrs.images) ? attrs.images : [],
      mrp,
      sellingPrice,
      discountPercent:
        typeof attrs.discountPercent === 'number'
          ? attrs.discountPercent
          : mrp > 0
            ? Math.round((1 - sellingPrice / mrp) * 10000) / 100
            : 0,
      quantity,
      lowStockThreshold,
      sku: typeof attrs.sku === 'string' ? attrs.sku : '',
      status: resolvedStatus,
      rejectionReason:
        typeof attrs.rejectionReason === 'string'
          ? attrs.rejectionReason
          : undefined,
      stockStatus: this.computeStockStatus(quantity, lowStockThreshold),
      storeId: product.storeId ?? undefined,
      createdAt: product.createdAt?.toISOString?.() ?? new Date().toISOString(),
      unitType:
        typeof attrs.unitType === 'string'
          ? attrs.unitType
          : (master?.baseUnit ?? 'pcs'),
      customUnit:
        typeof attrs.customUnit === 'string' ? attrs.customUnit : undefined,
      packageSize: Number(attrs.packageSize ?? 1),
      purchasePrice: Number(attrs.purchasePrice ?? 0),
      pricePerUnit: Number(attrs.pricePerUnit ?? 0),
      marginAmount: Number(attrs.marginAmount ?? 0),
      marginPercent: Number(attrs.marginPercent ?? 0),
    };
  }

  private async resolveProductCategoryId(
    categoryId?: string,
    categoryName?: string,
  ) {
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (categoryId && uuidPattern.test(categoryId)) {
      const existing = await this.categoriesRepo.findById(categoryId);
      if (existing) return existing.id;
    }

    const existingGeneral = await this.categoriesRepo.findBySlug('general');
    if (existingGeneral) return existingGeneral.id;

    const created = await this.categoriesRepo.create({
      name: categoryName?.trim() || 'General',
      slug: 'general',
      sortOrder: 0,
      isActive: true,
    });
    return created.id;
  }

  private async notifyAdminsIndependentProductListed(
    product: SellerProductEntity,
    sellerUserId: string,
  ) {
    const master = product.masterProduct;
    const productName = master?.name ?? product.title;
    const seller = await this.sellerProfiles.findOne({
      where: { userId: sellerUserId },
    });
    const independent = product.independentSellerId
      ? await this.independentSellers.findOne({
          where: { id: product.independentSellerId },
        })
      : null;
    const sellerName =
      independent?.businessName ?? seller?.businessName ?? 'Independent Seller';

    await this.notificationsService.notifyAdmins(
      'New Independent Seller Product',
      `${sellerName} listed "${productName}" for sale.`,
      {
        type: 'independent_product_listed',
        productId: product.id,
        productName,
        sellerName,
        independentSellerId: product.independentSellerId,
        sellerUserId,
        sellingPrice: product.sellingPrice,
      },
    );
  }

  private async requireIndependentSeller(userId: string) {
    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Seller profile not found');
    }
    const independent = await this.independentSellers.findOne({
      where: { sellerProfileId: seller.id },
    });
    if (!independent) {
      throw new BadRequestException(
        'Complete independent seller setup before managing products',
      );
    }
    return { seller, independent };
  }

  private async assertProductAccess(
    userId: string,
    userType: UserType,
    productId: string,
    storeId?: string,
  ): Promise<SellerProductEntity> {
    const product =
      await this.productsRepo.findSellerProductByIdForAccess(productId);
    if (!product || product.deletedAt)
      throw new NotFoundException('Product not found');

    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (owner) {
      if (!product.storeId) throw new NotFoundException('Product not found');
      if (product.sellerType !== SellerType.STORE)
        throw new NotFoundException('Product not found');
      const store = await this.stores.findOne({
        where: { id: product.storeId },
      });
      if (!store || store.storeOwnerId !== owner.id) {
        throw new NotFoundException('Product not found');
      }
      if (storeId && product.storeId !== storeId) {
        throw new NotFoundException('Product not found');
      }
      return product;
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    const ind = seller
      ? await this.independentSellers.findOne({
          where: { sellerProfileId: seller.id },
        })
      : null;
    if (!ind || product.independentSellerId !== ind.id) {
      throw new NotFoundException('Product not found');
    }
    if (product.sellerType !== SellerType.INDEPENDENT) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  private async resolveStoreOwnerProfile(userId: string, userType: UserType) {
    if (userType === UserType.STORE_OWNER) {
      return this.storeOwnerProfiles.findOne({ where: { userId } });
    }

    const seller = await this.sellerProfiles.findOne({ where: { userId } });
    if (seller?.partnerType !== PartnerType.STORE) return null;
    return this.storeOwnerProfiles.findOne({ where: { userId } });
  }

  private async assertStoreAccess(
    userId: string,
    userType: UserType,
    storeId: string,
  ) {
    const owner = await this.resolveStoreOwnerProfile(userId, userType);
    if (!owner) throw new NotFoundException('Store not found');

    const store = await this.stores.findOne({
      where: { id: storeId, storeOwnerId: owner.id },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  private mapStoreToResponse(
    store: StoreEntity,
    owner: StoreOwnerProfileEntity,
  ) {
    const details = (store.details ?? {}) as Record<string, unknown>;

    return {
      id: store.id,
      name: store.name,
      category: 'General',
      description: this.readString(details, 'description') ?? '',
      address: store.address ?? this.formatAddress(details) ?? '',
      city: this.readString(details, 'city'),
      area: this.readString(details, 'area'),
      pincode: this.readString(details, 'pincode'),
      latitude: store.lat
        ? parseFloat(store.lat)
        : this.readNumber(details, 'latitude'),
      longitude: store.lng
        ? parseFloat(store.lng)
        : this.readNumber(details, 'longitude'),
      openingTime: this.readString(details, 'openingTime') ?? '08:00',
      closingTime: this.readString(details, 'closingTime') ?? '22:00',
      is24Hours: Boolean(details.is24Hours),
      deliveryRadius: store.serviceRadiusKm
        ? parseFloat(store.serviceRadiusKm)
        : 5,
      partnerPickupRadiusKm:
        this.readNumber(details, 'partnerPickupRadiusKm') ?? 3,
      platformDeliveryEnabled: details.platformDeliveryEnabled !== false,
      contactNumber: this.readString(details, 'contactNumber') ?? '',
      isOpen: store.status === StoreStatus.ACTIVE,
      activeOrders: 0,
      partnerId: owner.userId,
    };
  }

  private buildStoreDetails(dto: CreateStoreDto) {
    return {
      description: dto.description ?? '',
      address: dto.address,
      city: dto.city,
      area: dto.area,
      pincode: dto.pincode,
      latitude: dto.latitude,
      longitude: dto.longitude,
      openingTime: dto.is24Hours ? '00:00' : (dto.openingTime ?? '08:00'),
      closingTime: dto.is24Hours ? '23:59' : (dto.closingTime ?? '22:00'),
      is24Hours: dto.is24Hours ?? false,
      partnerPickupRadiusKm: dto.partnerPickupRadiusKm ?? 3,
      platformDeliveryEnabled: dto.platformDeliveryEnabled ?? true,
      contactNumber: dto.contactNumber ?? '',
    };
  }

  private formatAddress(details: Record<string, unknown>) {
    const parts = [
      this.readString(details, 'address'),
      this.readString(details, 'area'),
      this.readString(details, 'city'),
      this.readString(details, 'pincode'),
    ].filter(Boolean);
    return parts.join(', ').slice(0, 500) || null;
  }

  private readString(source: object | null | undefined, key: string) {
    const value = (source as Record<string, unknown> | null | undefined)?.[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readNumber(source: object | null | undefined, key: string) {
    const value = (source as Record<string, unknown> | null | undefined)?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }
}
