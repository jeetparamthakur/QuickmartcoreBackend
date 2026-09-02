-- m3bd initial schema summary (Phase 1-7)
-- Generated for reference; TypeORM synchronize handles dev schema creation.

-- Core users & access control
-- users, user_sessions, customer_profiles, seller_profiles, store_owner_profiles
-- delivery_partner_profiles, admin_profiles, admin_permissions, admin_activities
-- roles, permissions, role_permissions, user_roles

-- Catalog & inventory
-- categories, master_products, product_variants, seller_products
-- stores, independent_sellers, inventory_items, inventory_reservations

-- Cart & orders
-- carts, cart_items, parent_orders, sub_orders, order_items, order_status_history

-- Charges & pricing
-- charge_rules, delivery_fee_slabs, commission_rules

-- Payments & finance
CREATE TYPE payment_method AS ENUM ('ONLINE', 'COD', 'WALLET');
CREATE TYPE ledger_entry_type AS ENUM (
  'CUSTOMER_PAYMENT', 'PLATFORM_FEE', 'SELLER_EARNING', 'DELIVERY_FEE',
  'REFUND', 'PAYOUT', 'COMMISSION', 'WALLET_CREDIT', 'WALLET_DEBIT'
);
CREATE TYPE refund_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- payments (parent_order_id, amount, method, status, provider_ref, idempotency_key)
-- refunds (payment_id, amount, status, reason, provider_ref)
-- ledger_entries (type, amount, reference_id, reference_type, metadata) -- immutable

-- Delivery
CREATE TYPE delivery_partner_preference AS ENUM ('STORE_ONLY', 'INDEPENDENT', 'BOTH');
CREATE TYPE delivery_assignment_status AS ENUM (
  'PENDING', 'ACCEPTED', 'REJECTED', 'TIMEOUT', 'IN_PROGRESS', 'COMPLETED'
);

-- delivery_partner_profiles extended: preference, is_online, current_lat, current_lng
-- delivery_assignments (sub_order_id, partner_profile_id, status, assigned_at, timeout_at)
-- partner_locations (partner_profile_id, lat, lng, recorded_at)

-- Payouts & wallet
CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');
CREATE TYPE wallet_owner_type AS ENUM ('CUSTOMER', 'SELLER', 'DELIVERY_PARTNER');
CREATE TYPE wallet_transaction_type AS ENUM ('CREDIT', 'DEBIT');

-- payouts, wallets, wallet_transactions

-- Growth
-- coupons, offers, banners, advertisements, notifications

-- Hardening
-- feature_flags, audit_logs, idempotency_keys

-- Indexes recommended on:
-- payments(parent_order_id), payments(idempotency_key)
-- ledger_entries(reference_id)
-- delivery_assignments(sub_order_id, partner_profile_id)
-- partner_locations(partner_profile_id, recorded_at)
-- notifications(user_id)
-- feature_flags(key)
