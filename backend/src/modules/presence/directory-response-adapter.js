"use strict";

const { enrichDirectoryWithProvider, legacySubmissionModeForProvider } = require("./directory-bridge");
const { getPresenceProvider } = require("./provider-registry");

function providerMetadata(directoryName, storedSubmissionMode = null) {
  const enriched = enrichDirectoryWithProvider({ name: directoryName });
  const provider = enriched.providerKey ? getPresenceProvider(enriched.providerKey) : null;
  return {
    providerKey: enriched.providerKey,
    providerType: enriched.providerType,
    capabilities: enriched.capabilities,
    managed: enriched.managed,
    requiresApproval: enriched.requiresApproval,
    submissionMode: provider ? legacySubmissionModeForProvider(provider) : (storedSubmissionMode || "manual")
  };
}

function adaptWorklistListing(row) {
  const presence = providerMetadata(row.directoryName, row.submissionMode);
  return {
    ...row,
    ...presence,
    presence
  };
}

function adaptPriorityWorklistRow(row) {
  const adapted = adaptWorklistListing(row);
  return {
    ...adapted,
    submissionMode: adapted.presence.submissionMode
  };
}

module.exports = {
  providerMetadata,
  adaptWorklistListing,
  adaptPriorityWorklistRow
};