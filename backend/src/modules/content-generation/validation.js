"use strict";

const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function fail(message, code = "GENERATION_VALIDATION_ERROR") {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = code;
  throw error;
}

function validateCreateJob(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Le job doit être un objet JSON.");
  const campaignId = String(input.campaignId || "").trim();
  if (!campaignId) fail("campaignId est obligatoire.");
  const priority = String(input.priority || "normal").toLowerCase();
  if (!PRIORITIES.has(priority)) fail("Priorité de génération invalide.");
  const requestedBy = input.requestedBy == null ? null : String(input.requestedBy).trim().slice(0, 160) || null;
  const options = input.options == null ? {} : input.options;
  if (!options || typeof options !== "object" || Array.isArray(options)) fail("options doit être un objet JSON.");
  return { campaignId, priority, requestedBy, options };
}

module.exports = { PRIORITIES, validateCreateJob };
