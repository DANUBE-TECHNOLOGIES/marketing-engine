"use strict";

const { listPresenceProviders } = require("./provider-registry");
const { directoryNameForProviderKey } = require("./directory-bridge");
const { getProviderReadiness } = require("./provider-readiness");

function auditProviderCatalog(directories = [], env = process.env) {
  const byName = new Map(directories.map((directory) => [directory.name, directory]));
  const providers = listPresenceProviders().map((provider) => {
    const expectedDirectoryName = directoryNameForProviderKey(provider.key);
    const directory = expectedDirectoryName ? byName.get(expectedDirectoryName) || null : null;
    const readiness = getProviderReadiness(provider.key, env);
    return Object.freeze({
      providerKey: provider.key,
      providerName: provider.name,
      expectedDirectoryName,
      directoryPresent: Boolean(directory),
      directoryActive: directory ? directory.active !== false : false,
      directoryId: directory?.id || null,
      operationalMode: readiness?.operationalMode || "blocked",
      providerReady: readiness?.ready === true,
      stage: readiness?.stage || "unknown"
    });
  });
  const missing = providers.filter((item) => !item.directoryPresent);
  const inactive = providers.filter((item) => item.directoryPresent && !item.directoryActive);
  return Object.freeze({
    ready: missing.length === 0,
    summary: Object.freeze({ providers: providers.length, present: providers.length - missing.length, missing: missing.length, inactive: inactive.length }),
    missing: Object.freeze(missing),
    inactive: Object.freeze(inactive),
    providers: Object.freeze(providers)
  });
}

module.exports = { auditProviderCatalog };
