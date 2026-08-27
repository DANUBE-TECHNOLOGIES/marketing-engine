"use strict";

const { getProviderSla, classifyAgainstSla } = require("./provider-sla");

function buildPropagationAlerts(rows = [], options = {}) {
  const providerKey = options.providerKey || "google_business_profile";
  const sla = getProviderSla(providerKey, options);
  const alerts = [];
  for (const row of rows) {
    const ageMs = row?.propagation?.ageMs ?? row?.ageMs ?? null;
    const severity = classifyAgainstSla(ageMs, sla);
    if (!["slow", "stale", "critical"].includes(severity)) continue;
    alerts.push(Object.freeze({
      agencyId: row.agencyId,
      agencyName: row.agencyName,
      city: row.city || null,
      listingId: row.listingId,
      listingUrl: row.listingUrl || null,
      providerKey,
      ageMs,
      severity,
      title: severity === "critical"
        ? `Propagation ${providerKey} critique — ${row.agencyName}`
        : `Propagation ${providerKey} ${severity} — ${row.agencyName}`,
      level: severity === "critical" ? "error" : severity === "stale" ? "warning" : "info"
    }));
  }
  const rank = { critical: 3, stale: 2, slow: 1 };
  alerts.sort((a, b) => (rank[b.severity] || 0) - (rank[a.severity] || 0) || (b.ageMs || 0) - (a.ageMs || 0));
  return Object.freeze({ providerKey, sla, total: alerts.length, alerts: Object.freeze(alerts) });
}

module.exports = { buildPropagationAlerts };
