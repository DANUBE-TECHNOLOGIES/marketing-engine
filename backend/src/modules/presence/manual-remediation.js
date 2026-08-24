"use strict";

const { getPresenceProvider } = require("./provider-registry");
const { directoryNameForProviderKey } = require("./directory-bridge");

function assertManualProvider(providerKey) {
  const provider = getPresenceProvider(providerKey);
  if (!provider) {
    const error = new Error("Provider Presence inconnu");
    error.status = 404;
    throw error;
  }
  const directoryName = directoryNameForProviderKey(providerKey);
  if (!directoryName) {
    const error = new Error("Aucun annuaire historique mappé pour ce provider");
    error.status = 409;
    throw error;
  }
  return { provider, directoryName };
}

function manualActionTitle(directoryName) {
  return `Présence locale — ${directoryName}`;
}

function buildManualRemediationPayload({ providerKey, listingId, drift = [], listingUrl = null, note = null }) {
  return Object.freeze({
    providerKey,
    listingId: listingId || null,
    drift: Object.freeze([...new Set(drift.filter(Boolean))]),
    listingUrl: listingUrl || null,
    note: note || null,
    externalWrite: false,
    requiresHumanAction: true
  });
}

module.exports = { assertManualProvider, manualActionTitle, buildManualRemediationPayload };
