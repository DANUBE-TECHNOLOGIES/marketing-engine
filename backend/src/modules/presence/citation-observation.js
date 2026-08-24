"use strict";

const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { compareNap } = require("./nap-diff");
const { getPresenceProvider } = require("./provider-registry");
const { legacySubmissionModeForProvider } = require("./directory-bridge");

function normalizeObservedNap(observed = {}) {
  const address = observed.address && typeof observed.address === "object"
    ? observed.address
    : {
        street: observed.address || null,
        postalCode: observed.postalCode || null,
        city: observed.city || null,
        countryCode: observed.countryCode || "FR"
      };

  return {
    name: observed.name || null,
    address: {
      street: address.street || address.addressLine || null,
      postalCode: address.postalCode || null,
      city: address.city || address.locality || null,
      countryCode: address.countryCode || "FR"
    },
    phone: observed.phone || null,
    website: observed.website || observed.websiteUri || null
  };
}

function evaluateCitationObservation({ agency, providerKey, observed }) {
  const provider = getPresenceProvider(providerKey);
  if (!provider) throw new Error(`Unknown Presence provider: ${providerKey}`);
  if (!agency) throw new Error("Agency is required");

  const canonical = buildCanonicalAgencyIdentity(agency);
  const normalizedObserved = normalizeObservedNap(observed);
  const diff = compareNap(canonical, normalizedObserved);

  return Object.freeze({
    agencyId: agency.id,
    providerKey,
    providerType: provider.type,
    submissionMode: legacySubmissionModeForProvider(provider),
    status: diff.match ? "in_sync" : "drift_detected",
    canonical,
    observed: Object.freeze(normalizedObserved),
    diff
  });
}

module.exports = {
  normalizeObservedNap,
  evaluateCitationObservation
};
