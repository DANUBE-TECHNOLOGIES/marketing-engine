"use strict";

const { auditDirectorySchema } = require("./directory-schema-audit");
const { auditPresenceStorage } = require("./presence-storage-audit");
const { getProviderReadiness } = require("./provider-readiness");

function envPresent(env, key) {
  return Boolean(String(env?.[key] || "").trim());
}

function envTrue(env, key) {
  return String(env?.[key] || "").trim().toLowerCase() === "true";
}

async function buildOperationalReadiness(prisma, env = process.env) {
  const [schema, storage] = await Promise.all([
    auditDirectorySchema(prisma),
    auditPresenceStorage(prisma)
  ]);
  const googleProvider = getProviderReadiness("google_business_profile", env);
  const appleProvider = getProviderReadiness("apple_business_connect", env);
  const googleToken = await prisma.googleToken.findFirst({ orderBy: { createdAt: "desc" } });
  const discoveryReady = envTrue(env, "DATAFORSEO_ENABLED") && envPresent(env, "DATAFORSEO_LOGIN") && envPresent(env, "DATAFORSEO_PASSWORD");
  const googleApiReady = schema.ready && storage.ready && Boolean(googleProvider?.ready) && Boolean(googleToken?.refreshToken);
  const googleWritesEnabled = envTrue(env, "PRESENCE_GOOGLE_WRITES_ENABLED");

  const checks = [
    { key: "directory_schema", ok: schema.ready, blocking: true, details: schema },
    { key: "presence_storage", ok: storage.ready, blocking: true, details: storage },
    { key: "google_oauth_config", ok: Boolean(googleProvider?.ready), blocking: true, details: googleProvider },
    { key: "google_refresh_token", ok: Boolean(googleToken?.refreshToken), blocking: true },
    { key: "google_writes_enabled", ok: googleWritesEnabled, blocking: true, details: { env: "PRESENCE_GOOGLE_WRITES_ENABLED", requiredValue: "true" } },
    { key: "dataforseo_enabled", ok: envTrue(env, "DATAFORSEO_ENABLED"), blocking: false },
    { key: "dataforseo_login", ok: envPresent(env, "DATAFORSEO_LOGIN"), blocking: false },
    { key: "dataforseo_password", ok: envPresent(env, "DATAFORSEO_PASSWORD"), blocking: false },
    { key: "apple_provider", ok: Boolean(appleProvider?.ready), blocking: false, details: appleProvider }
  ];

  const apiBlockerKeys = new Set(["directory_schema", "presence_storage", "google_oauth_config", "google_refresh_token"]);
  const blockers = checks.filter((item) => item.blocking && !item.ok).map((item) => item.key);
  const apiBlockers = blockers.filter((key) => apiBlockerKeys.has(key));
  const warnings = checks.filter((item) => !item.blocking && !item.ok).map((item) => item.key);
  return Object.freeze({
    readyForGoogleApi: googleApiReady && apiBlockers.length === 0,
    readyForGoogleManagedWrites: googleApiReady && googleWritesEnabled && blockers.length === 0,
    googleWritesEnabled,
    readyForDiscovery: discoveryReady,
    blockers: Object.freeze(blockers),
    apiBlockers: Object.freeze(apiBlockers),
    warnings: Object.freeze(warnings),
    checks: Object.freeze(checks)
  });
}

async function assertGoogleApiReady(prisma, env = process.env) {
  const readiness = await buildOperationalReadiness(prisma, env);
  if (!readiness.readyForGoogleApi) {
    const error = new Error(`Presence Google API non prête: ${readiness.apiBlockers.join(", ")}`);
    error.status = 503;
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

async function assertGoogleManagedWriteReady(prisma, env = process.env) {
  const readiness = await buildOperationalReadiness(prisma, env);
  if (!readiness.readyForGoogleManagedWrites) {
    const error = new Error(`Presence Google écriture non prête: ${readiness.blockers.join(", ")}`);
    error.status = 503;
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

async function assertDiscoveryReady(prisma, env = process.env) {
  const readiness = await buildOperationalReadiness(prisma, env);
  if (!readiness.readyForDiscovery) {
    const error = new Error("Presence discovery non prêt: DataForSEO doit être activé et configuré");
    error.status = 503;
    error.readiness = readiness;
    throw error;
  }
  return readiness;
}

module.exports = {
  buildOperationalReadiness,
  assertGoogleApiReady,
  assertGoogleManagedWriteReady,
  assertDiscoveryReady,
  envPresent,
  envTrue
};
