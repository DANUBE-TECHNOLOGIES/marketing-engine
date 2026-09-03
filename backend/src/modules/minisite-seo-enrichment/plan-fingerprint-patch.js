"use strict";

const crypto = require("node:crypto");

const INSTALLED = Symbol.for("mse-25.30.plan-fingerprint-guard-installed");
const EXPECTED = Symbol.for("mse-25.30.expected-plan-fingerprint");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function normalizeNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeParameters(options = {}) {
  return {
    similarityThreshold: normalizeNumber(options.similarityThreshold, 0.78),
    minimumWords: normalizeNumber(options.minimumWords, 80),
    qualityMinimumWords: normalizeNumber(options.qualityMinimumWords, 120),
  };
}

function normalizeChange(change = {}) {
  return {
    blockId: change.blockId ?? null,
    blockType: change.blockType || null,
    field: change.field || null,
    previous: change.previous ?? null,
    next: change.next ?? null,
    generated: change.generated === true,
    purpose: change.purpose || null,
  };
}

function sortByStableValue(values = []) {
  return [...values].sort((left, right) => stableStringify(left).localeCompare(stableStringify(right)));
}

function fingerprintPayload(plan = {}, parameters = {}) {
  const agencies = (plan.plans || []).map((agency) => ({
    agencyId: agency.agencyId ?? null,
    siteSlug: agency.siteSlug || null,
    targetCities: [...(agency.targetCities || [])].map(String).sort(),
    excludedPages: sortByStableValue((agency.excludedPages || []).map((page) => ({
      slug: page?.slug ?? null,
      reason: page?.reason ?? null,
    }))),
    pages: sortByStableValue((agency.pages || []).map((page) => ({
      slug: page?.slug ?? null,
      title: page?.title ?? null,
      published: page?.published === true,
      changed: page?.changed === true,
      changes: sortByStableValue((page?.changes || []).map(normalizeChange)),
    }))),
  }));

  return {
    version: plan.version || "mse-25.30",
    parameters: normalizeParameters(parameters),
    agencies: sortByStableValue(agencies),
  };
}

function planFingerprint(plan = {}, parameters = {}) {
  return crypto
    .createHash("sha256")
    .update(stableStringify(fingerprintPayload(plan, parameters)), "utf8")
    .digest("hex");
}

function normalizeFingerprint(value) {
  return String(value || "").trim().toLowerCase();
}

function assertApprovedFingerprint(actual, expected) {
  const approved = normalizeFingerprint(expected);
  if (!approved) return;

  const current = normalizeFingerprint(actual);
  if (current !== approved) {
    const error = new Error("Le plan MSE-25.30 a changé depuis le preview approuvé. Relancez le preflight avant toute écriture.");
    error.code = "MINISITE_SEO_NETWORK_APPROVED_PLAN_MISMATCH";
    error.status = 409;
    error.details = {
      expectedPlanFingerprint: approved,
      actualPlanFingerprint: current || null,
    };
    throw error;
  }
}

function installPlanFingerprintGuard(ServiceClass) {
  if (!ServiceClass?.prototype || ServiceClass.prototype[INSTALLED]) return ServiceClass;

  const prototype = ServiceClass.prototype;
  const originalBuild = prototype.buildNetworkContentOptimization;
  const originalOptimize = prototype.optimizeNetworkContent;
  const originalHealth = prototype.health;

  if (typeof originalBuild !== "function" || typeof originalOptimize !== "function") {
    throw new Error("MSE-25.30 plan fingerprint guard requires network optimization methods.");
  }

  prototype.buildNetworkContentOptimization = async function buildNetworkContentOptimizationWithFingerprint(options = {}) {
    const parameters = normalizeParameters(options);
    const plan = await originalBuild.call(this, parameters);
    const fingerprint = planFingerprint(plan, parameters);
    const enriched = {
      ...plan,
      parameters,
      planFingerprint: fingerprint,
    };

    assertApprovedFingerprint(fingerprint, this[EXPECTED]);
    return enriched;
  };

  prototype.optimizeNetworkContent = async function optimizeNetworkContentWithFingerprint(options = {}) {
    const expectedPlanFingerprint = normalizeFingerprint(options.expectedPlanFingerprint);
    const previousExpected = this[EXPECTED];
    this[EXPECTED] = expectedPlanFingerprint || null;
    try {
      const result = await originalOptimize.call(this, options);
      return {
        ...result,
        parameters: normalizeParameters(options),
        approvedPlanFingerprint: expectedPlanFingerprint || null,
      };
    } finally {
      this[EXPECTED] = previousExpected || null;
    }
  };

  if (typeof originalHealth === "function") {
    prototype.health = function healthWithPlanFingerprintGuard(...args) {
      return {
        ...originalHealth.apply(this, args),
        approvedPlanFingerprintGuard: true,
      };
    };
  }

  Object.defineProperty(prototype, INSTALLED, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return ServiceClass;
}

module.exports = {
  assertApprovedFingerprint,
  fingerprintPayload,
  installPlanFingerprintGuard,
  normalizeFingerprint,
  normalizeParameters,
  planFingerprint,
  stableStringify,
  stableValue,
};
