"use strict";

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(/\s+/g, " ");
  return normalized || null;
}

function normalizePhone(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  return raw.replace(/[^+\d]/g, "");
}

function normalizeWebsite(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw.match(/^https?:\/\//i) ? raw : `https://${raw}`);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw;
  }
}

function buildCanonicalAgencyIdentity(agency, options = {}) {
  if (!agency?.id) throw new Error("Agency is required");

  return Object.freeze({
    agencyId: agency.id,
    tenantId: agency.tenantId || null,
    name: cleanString(agency.name),
    address: Object.freeze({
      street: cleanString(agency.address),
      postalCode: cleanString(agency.postalCode),
      city: cleanString(agency.city),
      countryCode: cleanString(options.countryCode || agency.countryCode || "FR")
    }),
    phone: normalizePhone(agency.phone),
    email: cleanString(agency.email)?.toLowerCase() || null,
    website: normalizeWebsite(agency.website),
    googleLocationId: cleanString(agency.googleLocationId),
    source: "agency",
    schemaVersion: 1
  });
}

module.exports = {
  buildCanonicalAgencyIdentity,
  cleanString,
  normalizePhone,
  normalizeWebsite
};
