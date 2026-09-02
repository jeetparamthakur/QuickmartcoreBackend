export const MODULE_KEYS = [
  'dashboard',
  'orders',
  'customers',
  'stores',
  'shopOwners',
  'sellers',
  'independentSellers',
  'products',
  'categories',
  'deliveryPartners',
  'liveOperations',
  'finance',
  'payments',
  'payouts',
  'chargesPricing',
  'commission',
  'offers',
  'coupons',
  'banners',
  'advertisements',
  'analytics',
  'reports',
  'support',
  'notifications',
  'platformSettings',
  'auditLogs',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const ACTION_KEYS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'suspend',
  'export',
] as const;

export type ActionKey = (typeof ACTION_KEYS)[number];

export interface AdminPermissionsMatrix {
  permissionVersion: number;
  modulePermissions: Record<ModuleKey, boolean>;
  featurePermissions: Partial<Record<ModuleKey, Record<string, boolean>>>;
  actionPermissions: Record<ActionKey, boolean>;
  temporaryRestrictions: Array<{
    id: string;
    module?: ModuleKey;
    feature?: string;
    from: string;
    until: string;
    autoRestore: boolean;
    reason?: string;
  }>;
}

export function createDefaultAdminPermissions(): AdminPermissionsMatrix {
  const modulePermissions = Object.fromEntries(
    MODULE_KEYS.map((k) => [k, true]),
  ) as Record<ModuleKey, boolean>;

  modulePermissions.finance = false;
  modulePermissions.payouts = false;
  modulePermissions.platformSettings = false;

  return {
    permissionVersion: 1,
    modulePermissions,
    featurePermissions: {
      finance: { managePayouts: false, approvePayout: false },
    },
    actionPermissions: Object.fromEntries(
      ACTION_KEYS.map((k) => [k, true]),
    ) as Record<ActionKey, boolean>,
    temporaryRestrictions: [],
  };
}

export function applyTemporaryRestrictions(
  permissions: AdminPermissionsMatrix,
): AdminPermissionsMatrix & { computedAt: string } {
  const now = new Date();
  const active = permissions.temporaryRestrictions.filter((r) => {
    const from = new Date(r.from);
    const until = new Date(r.until);
    return now >= from && now <= until;
  });

  const modulePermissions = { ...permissions.modulePermissions };
  const featurePermissions = JSON.parse(
    JSON.stringify(permissions.featurePermissions),
  ) as AdminPermissionsMatrix['featurePermissions'];

  for (const restriction of active) {
    if (restriction.module && !restriction.feature) {
      modulePermissions[restriction.module] = false;
    }
    if (restriction.module && restriction.feature) {
      if (!featurePermissions[restriction.module]) {
        featurePermissions[restriction.module] = {};
      }
      featurePermissions[restriction.module]![restriction.feature] = false;
    }
  }

  return {
    ...permissions,
    modulePermissions,
    featurePermissions,
    computedAt: now.toISOString(),
  };
}
