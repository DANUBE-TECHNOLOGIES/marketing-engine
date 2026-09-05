"use strict";

const TRACKING_SCHEMA = "mse-25.125ae-v1";
const LEVER_PREFIX = "ranking-grid-territorial";
const SUPPORTED_STATUSES = new Set(["todo", "in_progress", "done"]);

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeStatus(value) {
  const status = String(value || "todo").trim().toLowerCase();
  if (!SUPPORTED_STATUSES.has(status)) {
    const error = new Error("status must be todo,in_progress,done");
    error.code = "RANKING_GRID_TERRITORIAL_ACTION_STATUS_INVALID";
    error.status = 400;
    throw error;
  }
  return status;
}

function actionLever({ campaignId, city, actionCode }) {
  return `${LEVER_PREFIX}:${Number(campaignId)}:${encodeURIComponent(String(city || "").trim())}:${String(actionCode || "").trim()}`;
}

function parseTrackingMetadata(comment) {
  if (!comment) return null;
  try {
    const parsed = JSON.parse(comment);
    return parsed?.schema === TRACKING_SCHEMA ? parsed : null;
  } catch {
    return null;
  }
}

function trackingMetadata({ campaign, methodologyKey, territory, action, userNote = null }) {
  const gridCells = Array.isArray(territory?.gridCells) ? territory.gridCells : [];
  return {
    schema: TRACKING_SCHEMA,
    sourceCampaignId: Number(campaign.id),
    keywordId: Number(campaign.keywordId),
    methodologyKey: String(methodologyKey || ""),
    territoryCity: String(territory.city || ""),
    urgency: String(territory.urgency || "monitor"),
    actionCode: String(action.code || ""),
    actionType: String(action.type || ""),
    baseline: {
      averageRank: Number.isFinite(Number(territory.averageRank)) ? Number(territory.averageRank) : null,
      worstRank: Number.isFinite(Number(territory.worstRank)) ? Number(territory.worstRank) : null,
      cells: gridCells.map((cell) => ({
        row: Number(cell.row),
        col: Number(cell.col),
        rank: Number.isFinite(Number(cell.rank)) ? Number(cell.rank) : null,
      })),
    },
    userNote: userNote == null ? null : String(userNote),
  };
}

function pointRank(point) {
  const value = Number(point?.position ?? point?.absolutePosition);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function measureTrackedImpact(metadata, campaign) {
  const baselineCells = Array.isArray(metadata?.baseline?.cells) ? metadata.baseline.cells : [];
  if (!campaign || !baselineCells.length) return null;

  const currentByCell = new Map(
    (campaign.points || []).map((point) => [`${point.row}:${point.col}`, pointRank(point)]),
  );

  const paired = baselineCells
    .map((cell) => ({
      row: Number(cell.row),
      col: Number(cell.col),
      baselineRank: Number.isFinite(Number(cell.rank)) ? Number(cell.rank) : null,
      currentRank: currentByCell.get(`${Number(cell.row)}:${Number(cell.col)}`) ?? null,
    }))
    .filter((cell) => cell.baselineRank != null && cell.currentRank != null);

  if (!paired.length) {
    return {
      campaignId: Number(campaign.id),
      comparableCells: 0,
      baselineAverageRank: null,
      currentAverageRank: null,
      averageRankGain: null,
      improved: 0,
      declined: 0,
      unchanged: 0,
    };
  }

  const baselineAverageRank = paired.reduce((sum, cell) => sum + cell.baselineRank, 0) / paired.length;
  const currentAverageRank = paired.reduce((sum, cell) => sum + cell.currentRank, 0) / paired.length;

  return {
    campaignId: Number(campaign.id),
    comparableCells: paired.length,
    baselineAverageRank: round(baselineAverageRank),
    currentAverageRank: round(currentAverageRank),
    averageRankGain: round(baselineAverageRank - currentAverageRank),
    improved: paired.filter((cell) => cell.currentRank < cell.baselineRank).length,
    declined: paired.filter((cell) => cell.currentRank > cell.baselineRank).length,
    unchanged: paired.filter((cell) => cell.currentRank === cell.baselineRank).length,
  };
}

function publicTrackedAction(row, currentCampaign = null) {
  const metadata = parseTrackingMetadata(row.comment);
  return {
    id: Number(row.id),
    agencyId: row.agencyId == null ? null : Number(row.agencyId),
    lever: row.lever,
    title: row.title,
    description: row.description,
    owner: row.owner,
    deadline: row.deadline,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    metadata,
    impact: metadata && currentCampaign && Number(currentCampaign.id) !== Number(metadata.sourceCampaignId)
      ? measureTrackedImpact(metadata, currentCampaign)
      : null,
  };
}

async function createTrackedAction({ prisma, agencyId, campaign, methodologyKey, territory, action, owner = null, deadline = null }) {
  const lever = actionLever({ campaignId: campaign.id, city: territory.city, actionCode: action.code });
  const existing = await prisma.networkAction.findFirst({ where: { agencyId: Number(agencyId), lever } });
  if (existing) return { created: false, action: existing };

  const metadata = trackingMetadata({ campaign, methodologyKey, territory, action });
  const row = await prisma.networkAction.create({
    data: {
      agencyId: Number(agencyId),
      lever,
      title: `${territory.city} — ${action.type}`,
      description: action.action,
      owner: owner ? String(owner).trim() || null : null,
      deadline: deadline ? new Date(deadline) : null,
      status: "todo",
      comment: JSON.stringify(metadata),
    },
  });
  return { created: true, action: row };
}

async function updateTrackedAction({ prisma, actionId, agencyId, status, owner, deadline, userNote }) {
  const row = await prisma.networkAction.findFirst({
    where: { id: Number(actionId), agencyId: Number(agencyId), lever: { startsWith: `${LEVER_PREFIX}:` } },
  });
  if (!row) {
    const error = new Error("territorial tracked action not found");
    error.code = "RANKING_GRID_TERRITORIAL_ACTION_NOT_FOUND";
    error.status = 404;
    throw error;
  }

  const metadata = parseTrackingMetadata(row.comment);
  const nextMetadata = metadata
    ? { ...metadata, userNote: userNote === undefined ? metadata.userNote : (userNote == null ? null : String(userNote)) }
    : null;

  return prisma.networkAction.update({
    where: { id: row.id },
    data: {
      status: status === undefined ? row.status : normalizeStatus(status),
      owner: owner === undefined ? row.owner : (owner ? String(owner).trim() || null : null),
      deadline: deadline === undefined ? row.deadline : (deadline ? new Date(deadline) : null),
      comment: nextMetadata ? JSON.stringify(nextMetadata) : row.comment,
    },
  });
}

module.exports = {
  TRACKING_SCHEMA,
  LEVER_PREFIX,
  normalizeStatus,
  actionLever,
  parseTrackingMetadata,
  trackingMetadata,
  measureTrackedImpact,
  publicTrackedAction,
  createTrackedAction,
  updateTrackedAction,
};
