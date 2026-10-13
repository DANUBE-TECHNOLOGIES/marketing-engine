/** FRAM Ambassade loyalty thresholds; indicative simulation only. */
export const FRAM_LOYALTY_THRESHOLDS = Object.freeze([
  { points: 40, discountPercent: 3 },
  { points: 60, discountPercent: 5 },
  { points: 100, discountPercent: 7 },
  { points: 150, discountPercent: 10 },
]);
export const FRAM_LOYALTY_EUROS_PER_POINT = 100;
export const FRAM_LOYALTY_VALIDITY_CALENDAR_YEARS = 5;
export function simulateFramLoyalty(eligibleSpendEuros) {
  if (!Number.isFinite(eligibleSpendEuros) || eligibleSpendEuros < 0) {
    throw new RangeError("Eligible spend must be a finite nonnegative number");
  }
  const points = Math.floor(eligibleSpendEuros / FRAM_LOYALTY_EUROS_PER_POINT);
  const tier = [...FRAM_LOYALTY_THRESHOLDS].reverse().find(t => points >= t.points);
  return { points, discountPercent: tier?.discountPercent ?? 0, nextTier: FRAM_LOYALTY_THRESHOLDS.find(t => points < t.points) ?? null };
}
