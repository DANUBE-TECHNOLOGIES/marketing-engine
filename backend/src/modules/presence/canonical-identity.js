"use strict";

function cleanString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(/\s+/g, " ");
  return normalized || null;
}

function normalizePhone(value, countryCode = "FR") {
  const raw = cleanString(value);
  if (!raw) return null;
  let normalized = raw.replace(/[^+\d]/g, "");
  if (countryCode === "FR") {
    if (/^0\d{9}$/.test(normalized)) normalized = `+33${normalized.slice(1)}`;
    if (/^33\d{9}$/.test(normalized)) normalized = `+${normalized}`;
  }
  return normalized;
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
  const countryCode = cleanString(options.countryCode || agency.countryCode || "FR");

  return Object.freeze({
    agencyId: agency.id,
    tenantId: agency.tenantId || null,
    name: cleanString(agency.name),
    address: Object.freeze({
      street: cleanString(agency.address),
      postalCode: cleanString(agency.postalCode),
      city: cleanString(agency.city),
      countryCode
    }),
    phone: normalizePhone(agency.phone, countryCode),
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