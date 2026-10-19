-- Delivery partner pay slabs (global when partner_profile_id IS NULL)
CREATE TABLE IF NOT EXISTS delivery_partner_pay_slabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_profile_id uuid NULL REFERENCES delivery_partner_profiles(id) ON DELETE CASCADE,
  zone_id uuid NULL,
  min_km decimal(8, 2) NOT NULL,
  max_km decimal(8, 2) NOT NULL,
  fee decimal(12, 2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dppp_slabs_partner
  ON delivery_partner_pay_slabs(partner_profile_id);

CREATE INDEX IF NOT EXISTS idx_dppp_slabs_active
  ON delivery_partner_pay_slabs(is_active);

ALTER TABLE delivery_assignments
  ADD COLUMN IF NOT EXISTS partner_earning decimal(12, 2) NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_assignments_partner_status
  ON delivery_assignments(partner_profile_id, status);
