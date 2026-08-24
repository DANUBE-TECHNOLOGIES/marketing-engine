"use strict";

const PRESENCE_PROVIDER_TYPES = Object.freeze({
  MANAGED_API: "managed_api",
  CONTRIBUTION_API: "contribution_api",
  MANAGED_PORTAL: "managed_portal",
  MONITORED_CITATION: "monitored_citation"
});

const PRESENCE_CAPABILITIES = Object.freeze({
  DISCOVER: "discover",
  READ: "read",
  CONNECT: "connect",
  PUSH: "push",
  SUBMIT: "submit",
  VERIFY: "verify",
  MEDIA: "media",
  HOURS: "hours",
  CATEGORIES: "categories"
});

function normalizeCapabilities(capabilities = []) {
  return [...new Set(capabilities.filter(Boolean))].sort();
}

function createPresenceProviderDefinition({
  key,
  name,
  type,
  capabilities = [],
  managed = false,
  requiresApproval = false,
  notes = null
}) {
  if (!key || !name) {
    throw new Error("Presence provider requires key and name");
  }
  if (!Object.values(PRESENCE_PROVIDER_TYPES).includes(type)) {
    throw new Error(`Unsupported presence provider type: ${type}`);
  }

  return Object.freeze({
    key,
    name,
    type,
    capabilities: Object.freeze(normalizeCapabilities(capabilities)),
    managed: Boolean(managed),
    requiresApproval: Boolean(requiresApproval),
    notes
  });
}

function hasCapability(provider, capability) {
  return Boolean(provider?.capabilities?.includes(capability));
}

module.exports = {
  PRESENCE_PROVIDER_TYPES,
  PRESENCE_CAPABILITIES,
  createPresenceProviderDefinition,
  hasCapability
};
