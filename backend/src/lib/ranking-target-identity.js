function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractPlaceId(value) {
  const raw = String(value || "");

  const patterns = [
    /[?&]query_place_id=([^&]+)/i,
    /[?&]place_id=([^&]+)/i,
    /[?&]placeid=([^&]+)/i,
    /\/place\/[^/]+\/data=.*?!1s([^!]+)/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);

    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }

  return null;
}

function resolveAgencyPlaceId(agency = {}) {
  return (
    agency.profilePlaceId ||
    agency.placeId ||
    agency.googlePlaceId ||
    extractPlaceId(agency.googleReviewUrl) ||
    null
  );
}

function matchRankingTarget({ agency, result }) {
  const targetPlaceId = resolveAgencyPlaceId(agency);

  const resultPlaceId =
    result?.placeId ||
    result?.place_id ||
    result?.profilePlaceId ||
    result?.googlePlaceId ||
    extractPlaceId(result?.url) ||
    null;

  /*
   * Exact Google entity identity is authoritative.
   * If both sides expose a Place ID, no brand/name fallback is allowed.
   */
  if (targetPlaceId && resultPlaceId) {
    return {
      matched: targetPlaceId === resultPlaceId,
      method: "place_id",
      targetPlaceId,
      resultPlaceId,
    };
  }

  const targetName = normalizeText(agency?.name);
  const targetCity = normalizeText(agency?.city);

  const resultName = normalizeText(
    result?.title ||
    result?.name ||
    result?.businessName
  );

  const resultLocation = normalizeText(
    result?.city ||
    result?.address ||
    result?.formattedAddress
  );

  /*
   * Legacy provider fallback:
   * brand similarity alone is explicitly insufficient.
   * The target agency name AND its physical city must agree.
   */
  const nameMatch =
    Boolean(targetName) &&
    Boolean(resultName) &&
    (
      resultName === targetName ||
      resultName.includes(targetName) ||
      targetName.includes(resultName)
    );

  const cityMatch =
    Boolean(targetCity) &&
    Boolean(resultLocation) &&
    resultLocation.includes(targetCity);

  return {
    matched: Boolean(nameMatch && cityMatch),
    method: "name_city_fallback",
    targetPlaceId,
    resultPlaceId,
  };
}

function isSameRankingTarget(args) {
  return matchRankingTarget(args).matched;
}

module.exports = {
  normalizeText,
  extractPlaceId,
  resolveAgencyPlaceId,
  matchRankingTarget,
  isSameRankingTarget,
};
