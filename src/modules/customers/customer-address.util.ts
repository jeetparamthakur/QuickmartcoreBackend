import { CustomerAddressEntity } from './entities/customer-address.entity';

export type AddressStructuredFields = {
  addressLine?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  pincode?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  fullAddress?: string | null;
};

export function formatCustomerFullAddress(fields: AddressStructuredFields): string {
  const line = fields.addressLine?.trim();
  const line2 = fields.addressLine2?.trim();
  const city = fields.city?.trim();
  const pincode = fields.pincode?.trim();
  const name = fields.receiverName?.trim();
  const phone = fields.receiverPhone?.trim();

  const locationParts = [line, line2, city].filter(Boolean);
  const location =
    locationParts.length > 0
      ? `${locationParts.join(', ')}${pincode ? ` - ${pincode}` : ''}`
      : fields.fullAddress?.trim() ?? '';

  if (name && phone && location) {
    return `${name} · ${phone} — ${location}`;
  }
  if (name && location) return `${name} — ${location}`;
  return location || fields.fullAddress?.trim() || '';
}

export function mergeAddressFields(
  existing: CustomerAddressEntity,
  patch: AddressStructuredFields,
): AddressStructuredFields {
  return {
    addressLine: patch.addressLine !== undefined ? patch.addressLine : existing.addressLine,
    addressLine2: patch.addressLine2 !== undefined ? patch.addressLine2 : existing.addressLine2,
    city: patch.city !== undefined ? patch.city : existing.city,
    pincode: patch.pincode !== undefined ? patch.pincode : existing.pincode,
    receiverName: patch.receiverName !== undefined ? patch.receiverName : existing.receiverName,
    receiverPhone:
      patch.receiverPhone !== undefined ? patch.receiverPhone : existing.receiverPhone,
    fullAddress: patch.fullAddress !== undefined ? patch.fullAddress : existing.fullAddress,
  };
}

export function normalizeIndianMobile(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}
