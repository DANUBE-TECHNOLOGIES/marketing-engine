"use strict";

const {
  normalizeEditorialTargeting,
} = require("./editorial-targeting");

function httpError(message, code, statusCode = 400) {
  return Object.assign(new Error(message), {
    statusCode,
    code,
  });
}

function cleanText(value, max) {
  const text = String(value ?? "").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function validateEditorialUpdate(input = {}) {
  const title = cleanText(input.title, 90);
  const excerpt = cleanText(input.excerpt, 240);

  if (!title) {
    throw httpError(
      "Le titre éditorial est obligatoire.",
      "AI_CONTENT_TITLE_REQUIRED"
    );
  }

  const patch = {
    title,
    excerpt: excerpt || null,
  };

  if (input.body && typeof input.body === "object" && !Array.isArray(input.body)) {
    patch.body = input.body;
  }

  if (input.editorialTargeting !== undefined) {
    patch.editorialTargeting = normalizeEditorialTargeting(input.editorialTargeting);
  }

  return patch;
}

async function assertEditorialTargetingAgenciesBelongToTenant(prisma, tenantId, targeting) {
  if (!targeting || targeting.scope !== "agencies") return;

  const requestedIds = targeting.agencyIds.map((value) => Number(value));
  if (
    requestedIds.some((value) => !Number.isSafeInteger(value) || value <= 0) ||
    !String(tenantId || "").trim()
  ) {
    throw httpError(
      "Une ou plusieurs agences ciblées sont invalides.",
      "AI_CONTENT_TARGET_AGENCY_INVALID"
    );
  }

  const agencies = await prisma.agency.findMany({
    where: {
      tenantId: String(tenantId),
      id: { in: requestedIds },
    },
    select: { id: true },
  });
  const allowedIds = new Set(agencies.map((agency) => String(agency.id)));
  const invalidIds = targeting.agencyIds.filter((id) => !allowedIds.has(String(id)));

  if (invalidIds.length) {
    throw httpError(
      "Une ou plusieurs agences ciblées ne sont pas disponibles pour ce réseau.",
      "AI_CONTENT_TARGET_AGENCY_INVALID"
    );
  }
}

function assertEditableEditorialContent(content) {
  const status = String(content?.status || "").toLowerCase();

  if (content?.campaignId) {
    const error = new Error(
      "Ce contenu appartient à une campagne et doit être modifié depuis le Campaign Manager."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_CAMPAIGN_REVIEW_REQUIRED";
    throw error;
  }

  if (status === "published") {
    const error = new Error(
      "Dépubliez ce contenu avant de le modifier."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_UNPUBLISH_BEFORE_EDIT";
    throw error;
  }

  if (!["draft", "review", "approved"].includes(status)) {
    const error = new Error(
      "Ce contenu ne peut pas être modifié dans son état actuel."
    );
    error.statusCode = 409;
    error.code = "AI_CONTENT_NOT_EDITABLE";
    throw error;
  }
}

module.exports = {
  validateEditorialUpdate,
  assertEditorialTargetingAgenciesBelongToTenant,
  assertEditableEditorialContent,
};
