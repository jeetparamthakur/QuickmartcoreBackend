-- Customer product wishlist
CREATE TABLE IF NOT EXISTS customer_wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  seller_product_id UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, seller_product_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_wishlist_customer_id ON customer_wishlist_items(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_wishlist_seller_product_id ON customer_wishlist_items(seller_product_id);

INSERT INTO permissions (id, key, description, created_at, updated_at)
SELECT gen_random_uuid(), 'wishlist:read', 'View wishlist', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'wishlist:read');

INSERT INTO permissions (id, key, description, created_at, updated_at)
SELECT gen_random_uuid(), 'wishlist:write', 'Modify wishlist', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE key = 'wishlist:write');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CUSTOMER'
  AND p.key IN ('wishlist:read', 'wishlist:write')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
