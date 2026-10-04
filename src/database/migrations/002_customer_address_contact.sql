-- Structured address + delivery contact (Blinkit-style)
ALTER TABLE customer_addresses
  ADD COLUMN IF NOT EXISTS address_line VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
  ADD COLUMN IF NOT EXISTS receiver_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS receiver_phone VARCHAR(20);
