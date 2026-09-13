"use strict";

const express = require("express");
const { randomUUID } = require("node:crypto");
const { notifyLead } = require("../../routes/publicLeads");

const CALLBACK_VERSION = "mse-25.210-v1";
const CONSENT_VERSION = "2026-09-webcallback-v1";
const CALLBACK_WORDING = "En envoyant cette demande, je demande à mon agence de voyage de me contacter par téléphone au sujet de mon projet et du créneau indiqué.";
const MARKETING_WORDING = "J’accepte de recevoir ultérieurement par téléphone des offres et conseils voyage de Mondescale Voyages.";
const TRAVEL_TYPES = new Set(["sejour", "circuit", "croisiere", "vol", "sur-mesure", "groupe", "business", "autre"]);
const SLOTS = new Set(["09-12", "12-14", "14-16", "16-18"]);
const buckets = new Map();

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}

function limited(req) {
  const now = Date.now();
  const key = clean(req.headers["x-forwarded-for"] || req.ip || "unknown", 120).split(",")[0];
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > 15 * 60 * 1000) bucket = { start: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count > 8;
}

function validateCallback(body = {}) {
  if (clean(body.website, 200)) return { spam: true };

  const data = {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 100),
    phone: clean(body.phone, 50),
    email: clean(body.email, 180).toLowerCase(),
    callbackMode: clean(body.callbackMode, 20) || "asap",
    requestedDate: clean(body.requestedDate, 20),
    requestedSlot: clean(body.requestedSlot, 20),
    travelType: clean(body.travelType, 30) || "autre",
    destination: clean(body.destination, 240),
    details: clean(body.details, 1500),
    marketingPhone: body.marketingPhone === true,
    sourcePath: clean(body.context?.sourcePath, 1000),
    sourcePage: clean(body.context?.sourcePage, 500),
    sourceReferrer: clean(body.context?.referrer, 2000),
    utmSource: clean(body.context?.utmSource, 240),
    utmMedium: clean(body.context?.utmMedium, 240),
    utmCampaign: clean(body.context?.utmCampaign, 240),
    utmContent: clean(body.context?.utmContent, 240),
    utmTerm: clean(body.context?.utmTerm, 240),
  };

  if (data.firstName.length < 2) return { error: "INVALID_FIRST_NAME" };
  if (data.phone.replace(/\D/g, "").length < 8) return { error: "INVALID_PHONE" };
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "INVALID_EMAIL" };
  if (!["asap", "later"].includes(data.callbackMode)) return { error: "INVALID_CALLBACK_MODE" };
  if (!TRAVEL_TYPES.has(data.travelType)) return { error: "INVALID_TRAVEL_TYPE" };
  if (data.callbackMode === "later") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.requestedDate)) return { error: "INVALID_CALLBACK_DATE" };
    if (!SLOTS.has(data.requestedSlot)) return { error: "INVALID_CALLBACK_SLOT" };
  }
  return { data };
}

function buildConsentEvidence(data, submittedAt) {
  return {
    version: CONSENT_VERSION,
    capturedAt: submittedAt,
    callbackRequest: {
      granted: true,
      wording: CALLBACK_WORDING,
      scope: "Réponse téléphonique à la demande de rappel et au projet renseigné",
    },
    phoneMarketing: {
      granted: data.marketingPhone === true,
      wording: MARKETING_WORDING,
      scope: "Offres et conseils voyage ultérieurs par téléphone",
    },
  };
}

async function persistCallback(prisma, site, data, req) {
  const recent = await prisma.$queryRawUnsafe(
    `SELECT "id","status","createdAt" FROM "PublicLead" WHERE "siteSlug"=$1 AND "source"='web-callback' AND regexp_replace(COALESCE("phone",''),'\\D','','g')=regexp_replace($2,'\\D','','g') AND "createdAt">NOW()-INTERVAL '10 minutes' ORDER BY "createdAt" DESC LIMIT 1`,
    site.slug,
    data.phone,
  );
  if (recent[0]) return { ...recent[0], duplicate: true };

  const submittedAt = new Date().toISOString();
  const id = `lead_${randomUUID().replaceAll("-", "")}`;
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ");
  const timing = data.callbackMode === "asap"
    ? "Dès que possible"
    : `${data.requestedDate} · ${data.requestedSlot.replace("-", "h–")}h`;
  const projectLabel = {
    sejour: "Séjour", circuit: "Circuit", croisiere: "Croisière", vol: "Vol / billetterie",
    "sur-mesure": "Voyage sur mesure", groupe: "Voyage en groupe", business: "Voyage d’affaires", autre: "Projet voyage",
  }[data.travelType] || "Projet voyage";
  const details = [
    `DEMANDE DE RAPPEL — ${timing}`,
    `Projet : ${projectLabel}`,
    data.destination ? `Destination : ${data.destination}` : null,
    data.details ? `Précisions : ${data.details}` : null,
    `Consentement rappel : oui — ${CONSENT_VERSION}`,
    `Prospection téléphonique future : ${data.marketingPhone ? "oui" : "non"}`,
  ].filter(Boolean).join("\n");
  const consentEvidence = buildConsentEvidence(data, submittedAt);
  const callbackMeta = {
    callbackMode: data.callbackMode,
    requestedDate: data.callbackMode === "later" ? data.requestedDate : null,
    requestedSlot: data.callbackMode === "later" ? data.requestedSlot : null,
    travelType: data.travelType,
    destination: data.destination || null,
    submittedAt,
    userAgent: clean(req.headers["user-agent"], 500) || null,
  };

  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO "PublicLead" ("id","agencyId","agencySiteId","siteSlug","projectType","source","sourcePage","sourcePath","sourceReferrer","utmSource","utmMedium","utmCampaign","utmContent","utmTerm","name","phone","email","destination","travelDates","travellers","budget","wishes","status","erpSyncStatus","notificationStatus","funnelId","funnelVersion","qualificationScore","leadTemperature","recommendedAction","funnelAnswers","consentEvidence","createdAt","updatedAt") VALUES ($1,$2,$3,$4,'leisure','web-callback',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'À préciser',NULL,$18,'NEW','DISABLED','PENDING','web-callback',$19,100,'HOT','Rappeler le client selon le créneau demandé',$20::jsonb,$21::jsonb,NOW(),NOW()) RETURNING "id","status","createdAt"`,
    id, site.agencyId, site.id, site.slug,
    data.sourcePage || "Web callback", data.sourcePath || null, data.sourceReferrer || null,
    data.utmSource || null, data.utmMedium || null, data.utmCampaign || "web-callback", data.utmContent || null, data.utmTerm || null,
    name, data.phone, data.email || null, data.destination || projectLabel, timing, details,
    CALLBACK_VERSION, JSON.stringify(callbackMeta), JSON.stringify(consentEvidence),
  );
  return { ...rows[0], duplicate: false };
}

function routes({ prisma } = {}) {
  const router = express.Router();

  router.post("/api/public/web-callback/:siteSlug", async (req, res) => {
    if (limited(req)) return res.status(429).json({ ok: false, error: "RATE_LIMITED" });
    const siteSlug = clean(req.params.siteSlug, 160);
    if (!/^[a-z0-9-]{2,160}$/.test(siteSlug)) return res.status(400).json({ ok: false, error: "INVALID_SITE" });
    const checked = validateCallback(req.body || {});
    if (checked.spam) return res.status(202).json({ ok: true });
    if (checked.error) return res.status(400).json({ ok: false, error: checked.error });
    if (!prisma) return res.status(503).json({ ok: false, error: "PERSISTENCE_UNAVAILABLE" });

    try {
      const site = await prisma.agencySite.findFirst({ where: { slug: siteSlug }, select: { id: true, agencyId: true, slug: true } });
      if (!site) return res.status(404).json({ ok: false, error: "SITE_NOT_FOUND" });
      const lead = await persistCallback(prisma, site, checked.data, req);
      let notification = { sent: false, status: lead.duplicate ? "DUPLICATE" : "UNKNOWN" };
      if (!lead.duplicate) {
        const notified = await notifyLead(prisma, lead.id);
        notification = notified.notification || notification;
      }
      return res.status(lead.duplicate ? 200 : 201).json({ ok: true, lead, notification });
    } catch (error) {
      console.error("[web-callback] intake failed", error);
      return res.status(500).json({ ok: false, error: "WEB_CALLBACK_FAILED" });
    }
  });

  return router;
}

module.exports = {
  CALLBACK_VERSION,
  CONSENT_VERSION,
  CALLBACK_WORDING,
  MARKETING_WORDING,
  TRAVEL_TYPES,
  SLOTS,
  buildConsentEvidence,
  validateCallback,
  routes,
};
