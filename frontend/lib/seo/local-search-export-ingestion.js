import { buildAgencyAttributionAudit } from "./local-search-agency-attribution.js";
import { detectObservedLocalSearchCannibalisation } from "./local-search-cannibalisation.js";
import { buildLocalSearchSnapshot } from "./local-search-network-measurement.js";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function weightedPosition(rows = []) {
  const weighted = rows.reduce((acc, row) => {
    const impressions = finite(row?.impressions);
    const position = Number(row?.position);
    if (!Number.isFinite(position) || impressions <= 0) return acc;
    acc.weight += impressions;
    acc.total += position * impressions;
    return acc;
  }, { weight: 0, total: 0 });

  return weighted.weight > 0 ? weighted.total / weighted.weight : null;
}

export function buildLocalSearchSnapshotFromSearchConsoleExport({
  rows = [],
  agencies = [],
  capturedAt = null,
  period = null,
} = {}) {
  const audit = buildAgencyAttributionAudit(rows, agencies);
  const attributedRows = audit.agencies.flatMap((agency) => agency.queryRows || []);
  const cannibalisation = detectObservedLocalSearchCannibalisation(attributedRows);

  const agencyRows = audit.agencies.map((agency) => {
    const impressions = finite(agency.impressions);
    const clicks = finite(agency.clicks);
    const position = weightedPosition(agency.queryRows);
    const agencyCannibalisation = cannibalisation.filter((item) => item.agencyKey === agency.agencyKey);

    return {
      agencyKey: agency.agencyKey,
      current: {
        impressions,
        clicks,
        ctr: impressions > 0 ? clicks / impressions : 0,
        position,
        queryCount: agency.queryCount,
        cannibalisation: agencyCannibalisation,
      },
      period,
    };
  });

  return {
    snapshot: buildLocalSearchSnapshot({
      capturedAt,
      period,
      agencies: agencyRows,
    }),
    attributionAudit: audit,
    cannibalisation,
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
  };
}
