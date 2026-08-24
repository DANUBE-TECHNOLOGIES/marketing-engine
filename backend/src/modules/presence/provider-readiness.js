"use strict";

const { getPresenceProvider } = require("./provider-registry");

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function check(key, ok, reason, source = "configuration") {
  return Object.freeze({ key, ok: Boolean(ok), reason, source });
}

function appleReadiness(env = process.env) {
  const checks = [
    check(
      "api_access_approved",
      truthy(env.APPLE_BUSINESS_API_APPROVED),
      "Apple Business Brand and Location API access must be approved before activation.",
      "apple_portal"
    ),
    check(
      "integration_verified",
      truthy(env.APPLE_BUSINESS_INTEGRATION_VERIFIED),
      "Apple requires API integration verification before production use.",
      "apple_portal"
    ),
    check(
      "data_quality_qualified",
      truthy(env.APPLE_BUSINESS_DATA_QUALIFIED),
      "Apple data qualification must be completed before production publication.",
      "apple_portal"
    ),
    check(
      "production_enabled",
      truthy(env.APPLE_BUSINESS_PRODUCTION_ENABLED),
      "The Brand and Location API must be enabled for Production in Apple Business.",
      "apple_portal"
    ),
    check(
      "client_id",
      Boolean(String(env.APPLE_BUSINESS_CLIENT_ID || "").trim()),
      "APPLE_BUSINESS_CLIENT_ID is required for the service account.",
      "environment"
    ),
    check(
      "client_secret",
      Boolean(String(env.APPLE_BUSINESS_CLIENT_SECRET || "").trim()),
      "APPLE_BUSINESS_CLIENT_SECRET is required for the service account.",
      "environment"
    )
  ];

  return Object.freeze({
    providerKey: "apple_business_connect",
    ready: checks.every((item) => item.ok),
    stage: checks.every((item) => item.ok) ? "production_ready" : "onboarding_required",
    checks: Object.freeze(checks)
  });
}

function googleReadiness(env = process.env) {
  const checks = [
    check("client_id", Boolean(String(env.GOOGLE_CLIENT_ID || "").trim()), "GOOGLE_CLIENT_ID is required."),
    check("client_secret", Boolean(String(env.GOOGLE_CLIENT_SECRET || "").trim()), "GOOGLE_CLIENT_SECRET is required.")
  ];
  return Object.freeze({
    providerKey: "google_business_profile",
    ready: checks.every((item) => item.ok),
    stage: checks.every((item) => item.ok) ? "configured" : "configuration_required",
    checks: Object.freeze(checks)
  });
}

function staticReadiness(providerKey) {
  const provider = getPresenceProvider(providerKey);
  if (!provider) return null;
  const activeApi = providerKey === "google_business_profile" || providerKey === "apple_business_connect";
  return Object.freeze({
    providerKey,
    ready: false,
    stage: activeApi ? "configuration_required" : "monitor_only",
    checks: Object.freeze([])
  });
}

function getProviderReadiness(providerKey, env = process.env) {
  if (!getPresenceProvider(providerKey)) return null;
  if (providerKey === "google_business_profile") return googleReadiness(env);
  if (providerKey === "apple_business_connect") return appleReadiness(env);
  return staticReadiness(providerKey);
}

module.exports = {
  getProviderReadiness,
  appleReadiness,
  googleReadiness
};