"use strict";

const { getPresenceProvider } = require("./provider-registry");

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function check(key, ok, reason, source = "configuration") {
  return Object.freeze({ key, ok: Boolean(ok), reason, source });
}

function result(providerKey, ready, stage, checks = [], extra = {}) {
  return Object.freeze({ providerKey, ready: Boolean(ready), stage, checks: Object.freeze(checks), ...extra });
}

function appleReadiness(env = process.env) {
  const checks = [
    check("api_access_approved", truthy(env.APPLE_BUSINESS_API_APPROVED), "Apple Business Brand and Location API access must be approved before activation.", "apple_portal"),
    check("integration_verified", truthy(env.APPLE_BUSINESS_INTEGRATION_VERIFIED), "Apple requires API integration verification before production use.", "apple_portal"),
    check("data_quality_qualified", truthy(env.APPLE_BUSINESS_DATA_QUALIFIED), "Apple data qualification must be completed before production publication.", "apple_portal"),
    check("production_enabled", truthy(env.APPLE_BUSINESS_PRODUCTION_ENABLED), "The Brand and Location API must be enabled for Production in Apple Business.", "apple_portal"),
    check("client_id", Boolean(String(env.APPLE_BUSINESS_CLIENT_ID || "").trim()), "APPLE_BUSINESS_CLIENT_ID is required for the service account.", "environment"),
    check("client_secret", Boolean(String(env.APPLE_BUSINESS_CLIENT_SECRET || "").trim()), "APPLE_BUSINESS_CLIENT_SECRET is required for the service account.", "environment")
  ];
  const ready = checks.every((item) => item.ok);
  return result("apple_business_connect", ready, ready ? "production_ready" : "onboarding_required", checks, { operationalMode: ready ? "managed_api" : "blocked" });
}

function googleReadiness(env = process.env) {
  const checks = [
    check("client_id", Boolean(String(env.GOOGLE_CLIENT_ID || "").trim()), "GOOGLE_CLIENT_ID is required."),
    check("client_secret", Boolean(String(env.GOOGLE_CLIENT_SECRET || "").trim()), "GOOGLE_CLIENT_SECRET is required.")
  ];
  const ready = checks.every((item) => item.ok);
  return result("google_business_profile", ready, ready ? "configured" : "configuration_required", checks, { operationalMode: ready ? "managed_api" : "blocked" });
}

function configuredApiReadiness(providerKey, envPrefix, env = process.env) {
  const enabled = truthy(env[`${envPrefix}_ENABLED`]);
  const token = Boolean(String(env[`${envPrefix}_API_KEY`] || env[`${envPrefix}_ACCESS_TOKEN`] || "").trim());
  const checks = [
    check("enabled", enabled, `${envPrefix}_ENABLED=true is required.`),
    check("credential", token, `${envPrefix}_API_KEY or ${envPrefix}_ACCESS_TOKEN is required.`)
  ];
  const ready = checks.every((item) => item.ok);
  return result(providerKey, ready, ready ? "production_ready" : "configuration_required", checks, { operationalMode: ready ? "submission_api" : "blocked" });
}

function manualReadiness(providerKey) {
  return result(providerKey, true, "manual_operational", [], { operationalMode: "manual" });
}

function monitoredReadiness(providerKey) {
  return result(providerKey, true, "monitor_operational", [], { operationalMode: "monitor" });
}

function blockedManagedReadiness(providerKey) {
  return result(providerKey, false, "integration_required", [], { operationalMode: "blocked" });
}

function getProviderReadiness(providerKey, env = process.env) {
  if (!getPresenceProvider(providerKey)) return null;
  if (providerKey === "google_business_profile") return googleReadiness(env);
  if (providerKey === "apple_business_connect") return appleReadiness(env);
  if (providerKey === "here") return configuredApiReadiness(providerKey, "HERE_PRESENCE", env);
  if (providerKey === "tomtom") return configuredApiReadiness(providerKey, "TOMTOM_PRESENCE", env);
  if (providerKey === "foursquare") return configuredApiReadiness(providerKey, "FOURSQUARE_PRESENCE", env);
  if (["pagesjaunes", "bing_places", "tripadvisor", "petit_fute", "118000"].includes(providerKey)) return manualReadiness(providerKey);
  if (providerKey === "mappy") return monitoredReadiness(providerKey);
  if (providerKey === "facebook") return blockedManagedReadiness(providerKey);
  return blockedManagedReadiness(providerKey);
}

module.exports = {
  getProviderReadiness,
  appleReadiness,
  googleReadiness,
  configuredApiReadiness
};