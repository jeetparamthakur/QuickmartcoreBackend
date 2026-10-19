export type PaySlabRow = {
  minKm: string;
  maxKm: string;
  fee: string;
};

export function resolveFeeFromSlabs(
  distanceKm: number,
  slabs: PaySlabRow[],
): number | null {
  const match = slabs.find(
    (s) =>
      distanceKm >= parseFloat(s.minKm) && distanceKm <= parseFloat(s.maxKm),
  );
  if (match) {
    return parseFloat(match.fee);
  }
  return null;
}

export function calculateDistanceFormulaFee(
  distanceKm: number,
  slabs: PaySlabRow[] = [],
): number {
  if (slabs.length > 0) {
    const lastSlab = slabs[slabs.length - 1];
    const baseFee = parseFloat(lastSlab.fee);
    const overflowKm = Math.max(0, distanceKm - parseFloat(lastSlab.maxKm));
    return baseFee + overflowKm * 5;
  }

  const baseFee = 20;
  const perKmRate = 8;
  return baseFee + Math.max(0, distanceKm - 1) * perKmRate;
}

export function calculatePartnerPayFromSlabs(
  distanceKm: number,
  slabs: PaySlabRow[],
): number {
  if (slabs.length === 0) {
    return calculateDistanceFormulaFee(distanceKm);
  }
  const matched = resolveFeeFromSlabs(distanceKm, slabs);
  if (matched != null) {
    return matched;
  }
  return calculateDistanceFormulaFee(distanceKm, slabs);
}
