"use strict";

const SEO_ACTION_LEVER = "seo_optimization";
const EXECUTED_STATUSES = new Set(["done", "completed", "executed"]);

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ note: String(value || "") });
  }
}

function parseJson(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeActionInput(input = {}) {
  const agencyId = Number(input.agencyId);
  if (!Number.isInteger(agencyId) || agencyId <= 0) {
    const error = new Error("Identifiant agence invalide.");
    error.statusCode = 400;
    error.code = "SEO_ACTION_INVALID_AGENCY_ID";
    throw error;
  }

  const title = String(input.title || "").trim();
  if (!title) {
    const error = new Error("Le titre de l'action SEO est obligatoire.");
    error.statusCode = 400;
    error.code = "SEO_ACTION_TITLE_REQUIRED";
    throw error;
  }

  const executedAt = input.executedAt ? new Date(input.executedAt) : new Date();
  if (Number.isNaN(executedAt.getTime())) {
    const error = new Error("Date d'exécution SEO invalide.");
    error.statusCode = 400;
    error.code = "SEO_ACTION_INVALID_EXECUTED_AT";
    throw error;
  }

  return {
    agencyId,
    title,
    description: String(input.description || input.detail || "").trim() || null,
    owner: String(input.owner || "").trim() || null,
    status: "done",
    comment: safeJson({
      schema: "seo-action-v1",
      executedAt: executedAt.toISOString(),
      source: input.source || null,
      code: input.code || null,
      keywordId: Number.isInteger(Number(input.keywordId)) ? Number(input.keywordId) : null,
      keyword: input.keyword || null,
      city: input.city || null,
      targetPage: input.targetPage || null,
      priority: input.priority || null,
    }),
  };
}

async function recordSeoAction(database, tenantId, input) {
  const data = normalizeActionInput(input);
  const agency = await database.agency.findFirst({
    where: { id: data.agencyId, tenantId },
    select: { id: true },
  });
  if (!agency) {
    const error = new Error("Agence introuvable dans ce tenant.");
    error.statusCode = 404;
    error.code = "SEO_ACTION_AGENCY_NOT_FOUND";
    throw error;
  }

  return database.networkAction.create({
    data: {
      agencyId: data.agencyId,
      lever: SEO_ACTION_LEVER,
      title: data.title,
      description: data.description,
      owner: data.owner,
      status: data.status,
      comment: data.comment,
    },
  });
}

function actionMetadata(action) {
  const metadata = parseJson(action?.comment);
  const executedAt = metadata.executedAt || action?.updatedAt || action?.createdAt || null;
  return {
    id: action?.id || null,
    title: action?.title || null,
    description: action?.description || null,
    owner: action?.owner || null,
    status: action?.status || null,
    executedAt,
    source: metadata.source || null,
    code: metadata.code || null,
    keywordId: metadata.keywordId || null,
    keyword: metadata.keyword || null,
    city: metadata.city || null,
    targetPage: metadata.targetPage || null,
    priority: metadata.priority || null,
  };
}

async function seoActionHistory(database, tenantId, agencyId, limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
  const actions = await database.networkAction.findMany({
    where: {
      agencyId: Number(agencyId),
      agency: { tenantId },
      lever: SEO_ACTION_LEVER,
      status: { in: Array.from(EXECUTED_STATUSES) },
    },
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });

  return actions.map(actionMetadata);
}

module.exports = {
  SEO_ACTION_LEVER,
  EXECUTED_STATUSES,
  safeJson,
  parseJson,
  normalizeActionInput,
  recordSeoAction,
  actionMetadata,
  seoActionHistory,
};
