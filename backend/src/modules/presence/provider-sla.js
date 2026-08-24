"use strict";

const DEFAULT_SLA = Object.freeze({
  warnAfterMs: 6 * 60 * 60 * 1000,
  staleAfterMs: 24 * 60 * 60 * 1000,
  criticalAfterMs: 72 * 60 * 60 * 1000
});

const PROVIDER_SLA = Object.freeze({
  google_business_profile: Object.freeze({ ...DEFAULT_SLA }),
  apple_business_connect: Object.freeze({
    warnAfterMs: 12 * 60 * 60 * 1000,
    staleAfterMs: 48 * 60 * 60 * 1000,
    criticalAfterMs: 7 * 24 * 60 * 60 * 1000
  })
});

function getProviderSla(providerKey, overrides = {}) {
  const base = PROVIDER_SLA[providerKey] || DEFAULT_SLA;
  return Object.freeze({
    warnAfterMs: Number(overrides.warnAfterMs ?? base.warnAfterMs),
    staleAfterMs: Number(overrides.staleAfterMs ?? base.staleAfterMs),
    criticalAfterMs: Number(overrides.criticalAfterMs ?? base.criticalAfterMs)
  });
}

function classifyAgainstSla(ageMs, sla = DEFAULT_SLA) {
  if (ageMs == null || !Number.isFinite(Number(ageMs))) return "unknown";
  const age = Number(ageMs);
  if (age >= sla.criticalAfterMs) return "critical";
  if (age >= sla.staleAfterMs) return "stale";
  if (age >= sla.warnAfterMs) return "slow";
  return "normal";
}

module.exports = { DEFAULT_SLA, PROVIDER_SLA, getProviderSla, classifyAgainstSla };
