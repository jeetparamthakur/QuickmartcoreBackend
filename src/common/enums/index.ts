export enum UserType {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  STORE_OWNER = 'STORE_OWNER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum SellerType {
  STORE = 'STORE',
  INDEPENDENT = 'INDEPENDENT',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum IndependentSellerStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum InventoryStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  CHECKOUT = 'CHECKOUT',
  ABANDONED = 'ABANDONED',
}

export enum ParentOrderStatus {
  PLACED = 'PLACED',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_CANCELLED = 'PARTIALLY_CANCELLED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum SubOrderStatus {
  PLACED = 'PLACED',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
  PICKED_UP = 'PICKED_UP',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum ReservationStatus {
  HELD = 'HELD',
  RELEASED = 'RELEASED',
  CONSUMED = 'CONSUMED',
}

export enum ChargeType {
  FIXED = 'FIXED',
  PERCENTAGE = 'PERCENTAGE',
}

export enum ActorType {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  STORE_OWNER = 'STORE_OWNER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum PaymentMethod {
  ONLINE = 'ONLINE',
  COD = 'COD',
  WALLET = 'WALLET',
}

export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum LedgerEntryType {
  CUSTOMER_PAYMENT = 'CUSTOMER_PAYMENT',
  PLATFORM_FEE = 'PLATFORM_FEE',
  SELLER_EARNING = 'SELLER_EARNING',
  DELIVERY_FEE = 'DELIVERY_FEE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  COMMISSION = 'COMMISSION',
  WALLET_CREDIT = 'WALLET_CREDIT',
  WALLET_DEBIT = 'WALLET_DEBIT',
}

export enum DeliveryPartnerPreference {
  STORE_ONLY = 'STORE_ONLY',
  INDEPENDENT = 'INDEPENDENT',
  BOTH = 'BOTH',
}

export enum DeliveryAssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum PayoutStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum WalletOwnerType {
  CUSTOMER = 'CUSTOMER',
  SELLER = 'SELLER',
  DELIVERY_PARTNER = 'DELIVERY_PARTNER',
}

export enum WalletTransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum CommissionRuleType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CouponScopeType {
  GLOBAL = 'GLOBAL',
  STORE = 'STORE',
  INDEPENDENT_SELLER = 'INDEPENDENT_SELLER',
}

export enum CouponFundingSource {
  PLATFORM = 'PLATFORM',
  SELLER = 'SELLER',
}

export enum CouponCreatedByType {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
}

export enum OfferStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum BannerPlacement {
  HOME_TOP = 'HOME_TOP',
  HOME_MIDDLE = 'HOME_MIDDLE',
  CATEGORY = 'CATEGORY',
}

export enum AdvertisementStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum KycStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum KycDocumentType {
  PAN = 'pan',
  GST = 'gst',
  BUSINESS = 'business',
  ADDRESS_PROOF = 'address_proof',
}

export enum OnboardingStep {
  PARTNER_TYPE = 'partner_type',
  BUSINESS_DETAILS = 'business_details',
  STORE_DETAILS = 'store_details',
  SELLER_SETUP = 'seller_setup',
  KYC = 'kyc',
  BANK_SETUP = 'bank_setup',
  PENDING_APPROVAL = 'pending_approval',
  COMPLETED = 'completed',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum PartnerType {
  STORE = 'STORE',
  INDEPENDENT_SELLER = 'INDEPENDENT_SELLER',
}

export enum StaffRole {
  STORE_MANAGER = 'store_manager',
  ORDER_MANAGER = 'order_manager',
  INVENTORY_MANAGER = 'inventory_manager',
}
