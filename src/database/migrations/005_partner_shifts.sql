-- Partner online/offline shift sessions
CREATE TABLE IF NOT EXISTS partner_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_profile_id uuid NOT NULL REFERENCES delivery_partner_profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NULL,
  deliveries_completed int NOT NULL DEFAULT 0,
  earnings decimal(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_shifts_partner_started
  ON partner_shifts(partner_profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_shifts_open
  ON partner_shifts(partner_profile_id)
  WHERE ended_at IS NULL;
