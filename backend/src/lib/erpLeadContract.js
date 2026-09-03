"use strict";

const crypto = require("node:crypto");

const ERP_LEAD_CONTRACT_VERSION = "mse-lead-v1";

function clean(value, max = 1000) {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized.slice(0, max) : null;
}

function normalizeProjectType(value) {
  const projectType = clean(value, 30);
  if (projectType === "group") return "GROUP";
  if (projectType === "business") return "BUSINESS";
  return "LEISURE";
}

function buildErpLeadPayload(lead) {
  if (!lead || typeof lead !== "object") throw new TypeError("LEAD_REQUIRED");

  const sourceLeadId = clean(lead.id, 160);
  const agencyId = clean(lead.agencyId, 160);
  const siteSlug = clean(lead.siteSlug, 160);
  const name = clean(lead.name, 120);
  const email = clean(lead.email, 180);
  const phone = clean(lead.phone, 50);

  if (!sourceLeadId) throw new TypeError("LEAD_ID_REQUIRED");
  if (!agencyId) throw new TypeError("AGENCY_ID_REQUIRED");
  if (!siteSlug) throw new TypeError("SITE_SLUG_REQUIRED");
  if (!name || !email || !phone) throw new TypeError("CONTACT_REQUIRED");

  return {
    contractVersion: ERP_LEAD_CONTRACT_VERSION,
    sourceSystem: "MARKETING_ENGINE",
    sourceLeadId,
    agency: {
      marketingEngineAgencyId: agencyId,
      siteSlug,
    },
    contact: {
      name,
      email: email.toLowerCase(),
      phone,
    },
    project: {
      type: normalizeProjectType(lead.projectType),
      destination: clean(lead.destination, 240),
      travelDates: clean(lead.travelDates, 160),
      travellers: clean(lead.travellers, 120),
      budget: clean(lead.budget, 160),
      wishes: clean(lead.wishes, 2500),
    },
    attribution: {
      source: clean(lead.source, 30) || "general",
      sourcePage: clean(lead.sourcePage, 500),
      sourcePath: clean(lead.sourcePath, 1000),
      sourceReferrer: clean(lead.sourceReferrer, 2000),
      utmSource: clean(lead.utmSource, 240),
      utmMedium: clean(lead.utmMedium, 240),
      utmCampaign: clean(lead.utmCampaign, 240),
      utmContent: clean(lead.utmContent, 240),
      utmTerm: clean(lead.utmTerm, 240),
    },
    receivedAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : null,
  };
}

function buildErpLeadIdempotencyKey(lead) {
  const payload = buildErpLeadPayload(lead);
  const raw = `${payload.contractVersion}:${payload.sourceSystem}:${payload.sourceLeadId}`;
  return `mse_${crypto.createHash("sha256").update(raw).digest("hex")}`;
}

function buildErpLeadRequest(lead) {
  const payload = buildErpLeadPayload(lead);
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mondescale-contract-version": ERP_LEAD_CONTRACT_VERSION,
      "idempotency-key": buildErpLeadIdempotencyKey(lead),
    },
    payload,
  };
}

module.exports = {
  ERP_LEAD_CONTRACT_VERSION,
  buildErpLeadIdempotencyKey,
  buildErpLeadPayload,
  buildErpLeadRequest,
  normalizeProjectType,
};
