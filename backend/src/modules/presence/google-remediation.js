"use strict";

const getGoogleAccessToken = require("../../lib/googleAccessToken");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { normalizeLocationName, readGoogleLocation } = require("./google-business-information");
const { compareNap } = require("./nap-diff");

const GOOGLE_BUSINESS_INFORMATION_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";
const FIELD_MAP = Object.freeze({
  name: "title",
  address: "storefrontAddress",
  phone: "phoneNumbers",
  website: "websiteUri"
});
const SENSITIVE_FIELDS = Object.freeze(["name", "address"]);

function remediationRisk(drift = []) {
  const sensitive = [...new Set(drift)].filter((field) => SENSITIVE_FIELDS.includes(field));
  return Object.freeze({
    level: sensitive.length ? "high" : "standard",
    sensitiveFields: Object.freeze(sensitive),
    requiresSensitiveConfirmation: sensitive.length > 0
  });
}

function buildGoogleRemediationPatch(agency, drift = []) {
  const canonical = buildCanonicalAgencyIdentity(agency);
  const requested = [...new Set(drift)].filter((field) => FIELD_MAP[field]);
  const body = {};
  const updateMask = [];

  for (const field of requested) {
    if (field === "name") body.title = canonical.name;
    if (field === "address") {
      body.storefrontAddress = {
        addressLines: canonical.address.street ? [canonical.address.street] : [],
        locality: canonical.address.city,
        postalCode: canonical.address.postalCode,
        regionCode: canonical.address.countryCode || "FR"
      };
    }
    if (field === "phone") body.phoneNumbers = { primaryPhone: canonical.phone };
    if (field === "website") body.websiteUri = canonical.website;
    updateMask.push(FIELD_MAP[field]);
  }

  return Object.freeze({
    locationName: normalizeLocationName(agency.googleLocationId),
    drift: Object.freeze(requested),
    risk: remediationRisk(requested),
    updateMask: Object.freeze(updateMask),
    body: Object.freeze(body)
  });
}

async function patchGoogleLocation(prisma, { agency, drift, validateOnly = false }) {
  const patch = buildGoogleRemediationPatch(agency, drift);
  if (!patch.locationName) throw new Error("googleLocationId manquant");
  if (!patch.updateMask.length) {
    const error = new Error("Aucun champ NAP Google supporté à corriger");
    error.status = 409;
    throw error;
  }

  const accessToken = await getGoogleAccessToken(prisma);
  const params = new URLSearchParams({
    updateMask: patch.updateMask.join(","),
    validateOnly: validateOnly ? "true" : "false"
  });
  const response = await fetch(`${GOOGLE_BUSINESS_INFORMATION_BASE}/${patch.locationName}?${params.toString()}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(patch.body)
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(`Google Business Information PATCH ${response.status}`);
    error.status = response.status;
    error.google = body;
    throw error;
  }
  return { patch, validateOnly, raw: body };
}

async function verifyGoogleRemediation(prisma, agency) {
  const remote = await readGoogleLocation(prisma, agency.googleLocationId);
  const canonical = buildCanonicalAgencyIdentity(agency);
  const diff = compareNap(canonical, remote.nap);
  return { remote: remote.nap, diff, verified: diff.match };
}

module.exports = {
  FIELD_MAP,
  SENSITIVE_FIELDS,
  remediationRisk,
  buildGoogleRemediationPatch,
  patchGoogleLocation,
  verifyGoogleRemediation
};
