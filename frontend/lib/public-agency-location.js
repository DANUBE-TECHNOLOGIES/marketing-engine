function cleanLocationValue(value) {
  return String(value || "").trim();
}

export function agencyAddressParts(agency = {}) {
  return [
    agency.name,
    agency.address,
    agency.postalCode,
    agency.city,
  ]
    .map(cleanLocationValue)
    .filter(Boolean);
}

export function hasCompletePhysicalAgencyAddress(agency = {}) {
  return Boolean(
    cleanLocationValue(agency.address) &&
    cleanLocationValue(agency.postalCode) &&
    cleanLocationValue(agency.city)
  );
}

export function physicalAgencyAddress(agency = {}) {
  if (!hasCompletePhysicalAgencyAddress(agency)) return null;

  return {
    address: cleanLocationValue(agency.address),
    postalCode: cleanLocationValue(agency.postalCode),
    city: cleanLocationValue(agency.city),
    region: cleanLocationValue(agency.region) || undefined,
  };
}

export function buildGoogleMapsSearchUrl(agency = {}) {
  const parts = agencyAddressParts(agency);

  if (parts.length < 2) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    parts.join(" ")
  )}`;
}
