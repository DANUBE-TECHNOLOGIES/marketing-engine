"use strict";

const getGoogleAccessToken = require("../../lib/googleAccessToken");

const GOOGLE_BUSINESS_INFORMATION_BASE =
  "https://mybusinessbusinessinformation.googleapis.com/v1";
const GOOGLE_NAP_READ_MASK = [
  "name",
  "title",
  "storefrontAddress",
  "phoneNumbers",
  "websiteUri"
].join(",");

function normalizeLocationName(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("locations/")) return raw;
  const match = raw.match(/locations\/([^/?#]+)/);
  return match ? `locations/${match[1]}` : `locations/${raw}`;
}

function mapGoogleLocationToNap(location) {
  const address = location?.storefrontAddress || {};
  return {
    externalId: normalizeLocationName(location?.name),
    name: location?.title || null,
    address: {
      street: Array.isArray(address.addressLines)
        ? address.addressLines.filter(Boolean).join(" ")
        : null,
      postalCode: address.postalCode || null,
      city: address.locality || null,
      countryCode: address.regionCode || "FR"
    },
    phone: location?.phoneNumbers?.primaryPhone || null,
    website: location?.websiteUri || null
  };
}

async function readGoogleLocation(prisma, googleLocationId) {
  const locationName = normalizeLocationName(googleLocationId);
  if (!locationName) throw new Error("googleLocationId manquant");

  const accessToken = await getGoogleAccessToken(prisma);
  const url = `${GOOGLE_BUSINESS_INFORMATION_BASE}/${locationName}?readMask=${encodeURIComponent(GOOGLE_NAP_READ_MASK)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Google Business Information ${response.status}`);
    error.status = response.status;
    error.google = body;
    throw error;
  }

  return { raw: body, nap: mapGoogleLocationToNap(body) };
}

module.exports = {
  GOOGLE_NAP_READ_MASK,
  normalizeLocationName,
  mapGoogleLocationToNap,
  readGoogleLocation
};