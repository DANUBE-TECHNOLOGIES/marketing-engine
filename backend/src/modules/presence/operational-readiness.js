"use strict";

const { auditDirectorySchema } = require("./directory-schema-audit");
const { getProviderReadiness } = require("./provider-readiness");

function envPresent(env, key) {
  return Boolean(String(env?.[key] || "").trim());
}

function envTrue(env, key) {
  return String(env?.[key] || "").trim().toLowerCase() === "true";
}

async function buildOperationalReadiness(prisma, env = process.env) {
  const schema = await auditDirectorySchema(prisma);
  const googleProvider = getProviderReadiness("google_business_profile", env);
  const appleProvider = getProviderReadiness("apple_business_connect", env);
  const googleToken = await prisma.googleToken.findFirst({ orderBy: { createdAt: "desc" } });
  const discoveryReady = envTrue(env, "DATAFORSEO_ENABLED") && envPresent(env, "DATAFORSEO_LOGIN") && envPresent(env, "DATAFORSEO_PASSWORD");

  const checks = [
    { key: "directory_schema", ok: schema.ready, blocking: true, details: schema },
    { key: "google_oauth_config", ok: Boolean(googleProvider?.ready), blocking: true, details: googleProvider },
    { key: "google_refresh_token", ok: Boolean(googleToken?.refreshToken), blocking: true },
    { key: "dataforseo_enabled", ok: envTrue(env, "DATAFORSEO_ENABLED"), blocking: false },
    { key: "dataforseo_login", ok: envPresent(env, "DATAFORSEO_LOGIN"), blocking: false },
    { key: "dataforseo_password", ok: envPresent(env, "DATAFORSEO_PASSWORD"), blocking: false },
    { key: "apple_provider", ok: Boolean(appleProvider?.ready), blocking: false, details: appleProvider }
  ];

  const blockers = checks.filter((item) => item.blocking && !item.ok).map((item) => item.key);
  const warnings = checks.filter((item) => !item.blocking && !item.ok).map((item) => item.key);
  return Object.freeze({
    readyForGoogleManagedWrites: blockers.length === 0,
    readyForDiscovery: discoveryReady,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    checks: Object.freeze(checks)
  });
}

module.exports = { buildOperationalReadiness, envPresent, envTrue };
