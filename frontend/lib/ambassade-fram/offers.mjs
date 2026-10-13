/** Public offer publication contract: expired/draft offers never appear. */
export const FRAM_OFFER_TYPES = Object.freeze(["EXCLUS_AMBASSADE", "VENTE_FLASH"]);
export function publicFramOffers(offers, now = new Date()) {
  const timestamp = now.getTime();
  if (!Number.isFinite(timestamp)) throw new RangeError("Invalid clock");
  return offers.filter(offer => {
    if (!offer || offer.status !== "PUBLISHED" || !FRAM_OFFER_TYPES.includes(offer.type)) return false;
    if (!offer.title || !offer.startAt || !offer.endAt) return false;
    const start = new Date(offer.startAt).getTime();
    const end = new Date(offer.endAt).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start <= timestamp && timestamp < end;
  });
}
export function currentMonthlyExclusives(offers, now = new Date()) {
  return publicFramOffers(offers, now).filter(offer => offer.type === "EXCLUS_AMBASSADE").slice(0, 4);
}
