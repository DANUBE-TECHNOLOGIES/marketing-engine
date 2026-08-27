"use strict";

const SAFE_DRIFT = new Set(["phone", "website"]);
const SENSITIVE_DRIFT = new Set(["name", "address"]);

function unique(values) { return [...new Set(values)]; }

function buildPilotAgencyRecommendations(state = {}, options = {}) {
  const maxAgencies = Math.max(1, Math.min(Number(options.maxAgencies || 3), 10));
  const agencies = new Map((state.agencies || []).map((agency) => [agency.id, agency]));
  const items = (state.interventionQueue || []).filter((item) => item.providerKey === "google_business_profile" && item.source === "nap_anomaly");
  const grouped = new Map();

  for (const item of items) {
    if (!item.agencyId) continue;
    const row = grouped.get(item.agencyId) || [];
    row.push(item);
    grouped.set(item.agencyId, row);
  }

  const candidates = [];
  for (const [agencyId, rows] of grouped.entries()) {
    const agency = agencies.get(agencyId) || {};
    const drift = unique(rows.flatMap((row) => Array.isArray(row.drift) ? row.drift : []));
    const sensitive = drift.filter((field) => SENSITIVE_DRIFT.has(field));
    const unsupported = drift.filter((field) => !SAFE_DRIFT.has(field) && !SENSITIVE_DRIFT.has(field));
    const executableRows = rows.filter((row) => row.executable === true && row.remediationKind === "managed_api");
    const eligible = sensitive.length === 0 && unsupported.length === 0 && executableRows.length > 0 && executableRows.length === rows.length;
    const riskScore = (sensitive.length * 1000) + (unsupported.length * 500) + (rows.length * 20) + rows.reduce((sum, row) => sum + Number(row.score || 0), 0);
    candidates.push(Object.freeze({
      agencyId,
      agencyName: agency.name || rows[0]?.agencyName || `Agence #${agencyId}`,
      city: agency.city || null,
      eligible,
      drift: Object.freeze(drift),
      itemCount: rows.length,
      executableCount: executableRows.length,
      sensitiveCount: sensitive.length,
      unsupportedCount: unsupported.length,
      riskScore,
      rationale: eligible ? "Google managed API, dérives non sensibles limitées à téléphone/site web." : sensitive.length ? "Écart sensible nom/adresse exclu du pilote." : unsupported.length ? "Champ non prévu pour le pilote initial." : "Remédiation non entièrement automatisable."
    }));
  }

  candidates.sort((a, b) => Number(b.eligible) - Number(a.eligible) || a.riskScore - b.riskScore || a.agencyId - b.agencyId);
  const recommended = candidates.filter((item) => item.eligible).slice(0, maxAgencies);
  return Object.freeze({
    maxAgencies,
    candidateCount: candidates.length,
    eligibleCount: candidates.filter((item) => item.eligible).length,
    recommendedAgencyIds: Object.freeze(recommended.map((item) => item.agencyId)),
    recommended: Object.freeze(recommended),
    candidates: Object.freeze(candidates)
  });
}

module.exports = { SAFE_DRIFT, SENSITIVE_DRIFT, buildPilotAgencyRecommendations };
