export function agencyAddressParts(agency = {}) {
  return [
    agency.name,
    agency.address,
    agency.postalCode,
    agency.city,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
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
