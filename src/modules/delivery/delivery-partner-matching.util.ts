import {
  DeliveryPartnerPreference,
  SellerType,
} from '../../common/enums';
import { DeliveryPartnerProfileEntity } from '../delivery-partners/entities/delivery-partner-profile.entity';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';

export type PartnerRequestFilters = {
  scope?: string;
  storeId?: string;
  sellerId?: string;
};

export function subOrderMatchesPartner(
  subOrder: SubOrderEntity,
  profile: DeliveryPartnerProfileEntity,
  filters: PartnerRequestFilters = {},
): boolean {
  if (profile.preference === DeliveryPartnerPreference.STORE_ONLY) {
    if (subOrder.sellerType !== SellerType.STORE) return false;
  } else if (profile.preference === DeliveryPartnerPreference.INDEPENDENT) {
    if (subOrder.sellerType !== SellerType.INDEPENDENT) return false;
  }

  const details = profile.profileDetails ?? {};
  const scope = filters.scope ?? details.deliveryScope;
  if (scope === 'store' && subOrder.sellerType !== SellerType.STORE) {
    return false;
  }
  if (scope === 'seller' && subOrder.sellerType !== SellerType.INDEPENDENT) {
    return false;
  }

  const storeId = filters.storeId ?? details.storeId;
  if (storeId && subOrder.storeId !== storeId) {
    return false;
  }

  const sellerId = filters.sellerId ?? details.sellerId;
  if (sellerId && subOrder.independentSellerId !== sellerId) {
    return false;
  }

  return true;
}
