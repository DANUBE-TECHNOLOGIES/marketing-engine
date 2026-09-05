"use strict";

function pointClass(point) {
  if (!point || point.status === "error") return "error";
  if (point.found === true && Number.isFinite(Number(point.position))) return "found";
  if (point?.providerMetadata?.noSearchResults === true) return "no_search";
  return "not_found";
}

function maskForCampaign(campaign) {
  const size = Number(campaign.gridSize);
  const byCell = new Map((campaign.points || []).map((p) => [`${Number(p.row)}:${Number(p.col)}`, p]));
  const rows = [];
  for (let row = 0; row < size; row += 1) {
    let line = "";
    for (let col = 0; col < size; col += 1) {
      const cls = pointClass(byCell.get(`${row}:${col}`));
      line += cls === "found" ? "F" : cls === "no_search" ? "N" : cls === "error" ? "E" : "-";
    }
    rows.push(line);
  }
  return rows.join("/");
}

function foundMaskForCampaign(campaign) {
  const size = Number(campaign.gridSize);
  const byCell = new Map((campaign.points || []).map((p) => [`${Number(p.row)}:${Number(p.col)}`, p]));
  const rows = [];
  for (let row = 0; row < size; row += 1) {
    let line = "";
    for (let col = 0; col < size; col += 1) {
      line += pointClass(byCell.get(`${row}:${col}`)) === "found" ? "F" : "-";
    }
    rows.push(line);
  }
  return rows.join("/");
}

function summarizeCalibrationCampaign(campaign) {
  const points = Array.isArray(campaign.points) ? campaign.points : [];
  const counts = { found: 0, noSearch: 0, notFound: 0, errors: 0 };
  const rowFound = Array(Number(campaign.gridSize)).fill(0);
  const colFound = Array(Number(campaign.gridSize)).fill(0);
  for (const point of points) {
    const cls = pointClass(point);
    if (cls === "found") {
      counts.found += 1;
      rowFound[Number(point.row)] += 1;
      colFound[Number(point.col)] += 1;
    } else if (cls === "no_search") counts.noSearch += 1;
    else if (cls === "error") counts.errors += 1;
    else counts.notFound += 1;
  }
  return {
    campaignId: Number(campaign.id),
    agencyId: Number(campaign.agencyId),
    agencyName: campaign.agencyName || null,
    city: campaign.city,
    keyword: campaign.keyword,
    status: campaign.status,
    gridSize: Number(campaign.gridSize),
    spacingKm: Number(campaign.spacingKm),
    provider: campaign.provider,
    mask: maskForCampaign(campaign),
    foundMask: foundMaskForCampaign(campaign),
    ...counts,
    rowFound,
    colFound,
    presenceRate: campaign.summary?.presenceRate ?? null,
    top3Rate: campaign.summary?.top3Rate ?? null,
    averagePosition: campaign.summary?.averagePosition ?? null,
  };
}

function groupsFor(rows, key) {
  const grouped = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!grouped.has(value)) grouped.set(value, []);
    grouped.get(value).push(row.campaignId);
  }
  return [...grouped.entries()]
    .map(([mask, campaignIds]) => ({ mask, campaignIds, count: campaignIds.length }))
    .sort((a, b) => b.count - a.count || a.mask.localeCompare(b.mask));
}

function buildCalibrationReport(campaigns = []) {
  const rows = campaigns.map(summarizeCalibrationCampaign);
  const maskGroups = groupsFor(rows, "mask");
  const foundMaskGroups = groupsFor(rows, "foundMask");
  const dominant = maskGroups[0] || null;
  const dominantFound = foundMaskGroups[0] || null;
  const identicalMaskRate = rows.length && dominant ? Math.round((dominant.count / rows.length) * 1000) / 1000 : 0;
  const identicalFoundMaskRate = rows.length && dominantFound ? Math.round((dominantFound.count / rows.length) * 1000) / 1000 : 0;
  const geometryWarning = rows.length >= 2 && identicalFoundMaskRate >= 0.75;
  return {
    mode: "read_only",
    providerCalls: 0,
    executionTriggered: false,
    summary: {
      campaigns: rows.length,
      distinctMasks: maskGroups.length,
      dominantMask: dominant?.mask || null,
      dominantMaskCampaigns: dominant?.count || 0,
      identicalMaskRate,
      distinctFoundMasks: foundMaskGroups.length,
      dominantFoundMask: dominantFound?.mask || null,
      dominantFoundMaskCampaigns: dominantFound?.count || 0,
      identicalFoundMaskRate,
      geometryWarning,
      interpretation: geometryWarning
        ? "A dominant found-only footprint is shared by at least 75% of campaigns. Presence rate is geometry-sensitive until zoom/viewport calibration is completed."
        : "No dominant shared found-only footprint detected at the 75% threshold.",
    },
    maskGroups,
    foundMaskGroups,
    campaigns: rows,
  };
}

module.exports = {
  pointClass,
  maskForCampaign,
  foundMaskForCampaign,
  summarizeCalibrationCampaign,
  buildCalibrationReport,
};
