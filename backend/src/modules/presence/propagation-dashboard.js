"use strict";

function buildPropagationDashboard(pendingRows = [], actions = []) {
  const summary = { pending: 0, normal: 0, slow: 0, stale: 0, unknown: 0, openEscalations: actions.length };
  const byAgency = new Map();

  for (const row of pendingRows) {
    const state = row?.propagation?.state || "unknown";
    summary.pending += 1;
    summary[state] = (summary[state] || 0) + 1;
    byAgency.set(row.agencyId, {
      agencyId: row.agencyId,
      agencyName: row.agencyName,
      city: row.city,
      listingId: row.listingId,
      listingUrl: row.listingUrl || null,
      state,
      ageMs: row.propagation.ageMs,
      submittedAt: row.submittedAt || null,
      escalationOpen: false,
      actionId: null
    });
  }

  for (const action of actions) {
    const item = byAgency.get(action.agencyId);
    if (item) {
      item.escalationOpen = true;
      item.actionId = action.id;
    }
  }

  const rows = [...byAgency.values()].sort((a, b) => {
    const rank = { stale: 3, slow: 2, normal: 1, unknown: 0 };
    return (rank[b.state] || 0) - (rank[a.state] || 0) || (b.ageMs || 0) - (a.ageMs || 0) || a.agencyName.localeCompare(b.agencyName);
  });

  return Object.freeze({ summary: Object.freeze(summary), rows: Object.freeze(rows) });
}

module.exports = { buildPropagationDashboard };
