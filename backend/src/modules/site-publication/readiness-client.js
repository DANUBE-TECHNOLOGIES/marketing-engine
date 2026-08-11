"use strict";

const {
  sitePublicationError,
} = require("./errors");

function deploymentTenantSlug() {
  return String(
    process.env.TENANT_SLUG ||
    process.env.NEXT_PUBLIC_TENANT_SLUG ||
    "mondescale"
  ).trim();
}

function forwardedHeaders(source = {}) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-tenant-slug": source["x-tenant-slug"] || deploymentTenantSlug(),
  };

  for (const name of [
    "authorization",
    "cookie",
    "x-tenant-id",
    "x-request-id",
    "x-user-id",
    "x-user-name",
  ]) {
    if (source[name]) {
      headers[name] = source[name];
    }
  }

  return headers;
}

function normalizeLaunchReadiness(payload) {
  const checks = Array.isArray(payload?.checks)
    ? payload.checks.map((check) => ({
        id: String(check.code || check.id || "unknown").toLowerCase(),
        label: check.label || check.code || "Contrôle",
        category: check.category || check.code || null,
        action: check.action || null,
        required: check.required !== false,
        ready: check.passed === true || check.ready === true,
      }))
    : [];

  const score = Number(
    payload?.readiness?.score ?? payload?.score ?? 0
  );

  const failedRequired = checks.filter(
    (check) => check.required && !check.ready
  );

  return {
    score,
    status:
      payload?.launchState?.code ||
      payload?.readiness?.grade ||
      payload?.status ||
      null,
    checks,
    summary: {
      required: checks.filter((check) => check.required).length,
      completed: checks.filter((check) => check.required && check.ready).length,
      missing: failedRequired.length,
    },
    source: "agency-launch-prepublication",
    site: payload?.site || null,
    agency: payload?.agency || null,
  };
}

class SiteReadinessClient {
  constructor({
    backendOrigin,
    frontendOrigin,
    readinessPathPrefix = "/api/agency-launch",
  } = {}) {
    this.backendOrigin = String(
      backendOrigin ||
      frontendOrigin ||
      `http://127.0.0.1:${process.env.PORT || 4000}`
    ).replace(/\/+$/, "");
    this.readinessPathPrefix = `/${String(readinessPathPrefix || "api/agency-launch")
      .replace(/^\/+|\/+$/g, "")}`;
  }

  async check({
    agencyId,
    headers,
  }) {
    let response;

    try {
      response = await fetch(
        `${this.backendOrigin}${this.readinessPathPrefix}/agencies/${encodeURIComponent(String(agencyId))}/readiness`,
        {
          method: "GET",
          headers: forwardedHeaders(headers),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (error) {
      throw sitePublicationError(
        "READINESS_SERVICE_UNAVAILABLE",
        "Le service de préparation du mini-site est indisponible.",
        502,
        {
          cause: error.message,
        }
      );
    }

    const text = await response.text();

    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw sitePublicationError(
        "READINESS_CHECK_FAILED",
        payload?.message || "La vérification Readiness a échoué.",
        response.status >= 400 ? response.status : 502,
        {
          status: response.status,
          payload,
        }
      );
    }

    return normalizeLaunchReadiness(payload);
  }

  assertReady(readiness) {
    const score = Number(readiness?.score || 0);
    const missing = Number(readiness?.summary?.missing || 0);

    if (score !== 100 || missing !== 0) {
      throw sitePublicationError(
        "SITE_NOT_READY",
        "Le mini-site ne peut pas être publié tant que tous les critères obligatoires ne sont pas validés.",
        409,
        {
          score,
          missing,
          status: readiness?.status || null,
          failedChecks: (readiness?.checks || [])
            .filter((check) => check.required && !check.ready)
            .map((check) => ({
              id: check.id,
              label: check.label,
              category: check.category,
              action: check.action,
            })),
        }
      );
    }

    return true;
  }
}

module.exports = {
  SiteReadinessClient,
  forwardedHeaders,
  normalizeLaunchReadiness,
  deploymentTenantSlug,
};
