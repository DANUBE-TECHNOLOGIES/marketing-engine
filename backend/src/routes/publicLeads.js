"use strict";

const express = require("express");
const { sendLeadNotification } = require("../lib/leadNotifications");

const PROJECTS = new Set(["leisure", "group", "business"]);
const SOURCES = new Set(["general", "group", "business"]);
const STATUSES = new Set(["NEW", "CONTACTED", "CONVERTED", "CLOSED"]);
const buckets = new Map();

function clean(value, max = 500) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
}
function validLeadId(id) { return /^lead_[a-z0-9]+$/.test(id); }
function limited(req) {
  const now = Date.now();
  const key = clean(req.headers["x-forwarded-for"] || req.ip || "unknown", 120).split(",")[0];
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > 900000) bucket = { start: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  return bucket.count > 8;
}
function validate(body = {}) {
  const data = {
    project: clean(body.project, 30), source: clean(body.source, 30) || "general", siteSlug: clean(body.siteSlug, 160),
    name: clean(body.name, 120), phone: clean(body.phone, 50), email: clean(body.email, 180).toLowerCase(),
    destination: clean(body.destination, 240), dates: clean(body.dates, 160), travellers: clean(body.travellers, 120),
    budget: clean(body.budget, 160), wishes: clean(body.wishes, 2500),
  };
  if (clean(body.website, 200)) return { spam: true };
  if (!PROJECTS.has(data.project)) return { error: "INVALID_PROJECT" };
  if (!SOURCES.has(data.source)) return { error: "INVALID_SOURCE" };
  if (!/^[a-z0-9-]{2,160}$/.test(data.siteSlug)) return { error: "INVALID_SITE" };
  if (data.name.length < 2) return { error: "INVALID_NAME" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { error: "INVALID_EMAIL" };
  if (data.phone.replace(/\D/g, "").length < 8) return { error: "INVALID_PHONE" };
  if (!data.destination || !data.dates || !data.travellers) return { error: "MISSING_PROJECT_DETAILS" };
  return { data };
}

async function loadLeadForNotification(prisma, id) {
  const rows = await prisma.$queryRaw`
    SELECT l.*, a."name" AS "agencyName", a."city" AS "agencyCity", a."email" AS "agencyEmail"
    FROM "PublicLead" l LEFT JOIN "Agency" a ON a."id" = l."agencyId"
    WHERE l."id" = ${id} LIMIT 1`;
  const lead = rows[0];
  if (!lead) return null;
  return { lead, agency: { id: lead.agencyId, name: lead.agencyName, city: lead.agencyCity, email: lead.agencyEmail } };
}
async function persistNotificationResult(prisma, id, result, errorMessage = null) {
  const status = clean(result?.status || (errorMessage ? "FAILED" : "NOT_SENT"), 30);
  const messageId = clean(result?.messageId, 240) || null;
  const error = clean(errorMessage || result?.reason, 1000) || null;
  const sent = result?.sent === true;
  await prisma.$executeRaw`UPDATE "PublicLead" SET "notificationStatus"=${status}, "notificationSentAt"=CASE WHEN ${sent} THEN NOW() ELSE "notificationSentAt" END, "notificationMessageId"=${messageId}, "notificationError"=${error}, "updatedAt"=NOW() WHERE "id"=${id}`;
}
async function notifyLead(prisma, id) {
  const loaded = await loadLeadForNotification(prisma, id);
  if (!loaded) return { ok: false, statusCode: 404, error: "LEAD_NOT_FOUND" };
  await prisma.$executeRaw`UPDATE "PublicLead" SET "notificationStatus"='PENDING', "notificationError"=NULL, "updatedAt"=NOW() WHERE "id"=${id}`;
  try {
    const result = await sendLeadNotification(loaded);
    await persistNotificationResult(prisma, id, result);
    return { ok: true, notification: result };
  } catch (error) {
    const message = clean(error?.message || "EMAIL_SEND_FAILED", 1000);
    await persistNotificationResult(prisma, id, { status: "FAILED", sent: false }, message);
    console.error("[public-leads] notification failed", { leadId: id, error: message });
    return { ok: true, notification: { sent: false, status: "FAILED", reason: message } };
  }
}

function createPublicLeadsRoutes(prisma) {
  const router = express.Router();
  router.post("/api/public/leads", async (req, res) => {
    if (limited(req)) return res.status(429).json({ ok: false, error: "RATE_LIMITED" });
    const checked = validate(req.body);
    if (checked.spam) return res.status(202).json({ ok: true });
    if (checked.error) return res.status(400).json({ ok: false, error: checked.error });
    try {
      const site = await prisma.agencySite.findFirst({ where: { slug: checked.data.siteSlug }, select: { id: true, agencyId: true, slug: true } });
      if (!site) return res.status(404).json({ ok: false, error: "SITE_NOT_FOUND" });
      const rows = await prisma.$queryRaw`
        INSERT INTO "PublicLead" ("id","agencyId","agencySiteId","siteSlug","projectType","source","name","phone","email","destination","travelDates","travellers","budget","wishes","status","erpSyncStatus","notificationStatus","createdAt","updatedAt")
        VALUES (concat('lead_',replace(gen_random_uuid()::text,'-','')),${site.agencyId},${site.id},${site.slug},${checked.data.project},${checked.data.source},${checked.data.name},${checked.data.phone},${checked.data.email},${checked.data.destination},${checked.data.dates},${checked.data.travellers},${checked.data.budget || null},${checked.data.wishes || null},'NEW','DISABLED','PENDING',NOW(),NOW()) RETURNING "id","status","createdAt"`;
      const notificationResult = await notifyLead(prisma, rows[0].id);
      return res.status(201).json({ ok: true, lead: rows[0], notification: notificationResult.notification || { sent: false, status: "UNKNOWN" } });
    } catch (error) { console.error("[public-leads] intake failed", error); return res.status(500).json({ ok: false, error: "LEAD_INTAKE_FAILED" }); }
  });

  router.get("/api/leads", async (req, res) => {
    try {
      const status = clean(req.query.status, 20).toUpperCase(); const siteSlug = clean(req.query.siteSlug, 160); const projectType = clean(req.query.projectType, 30);
      const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 250);
      const rows = await prisma.$queryRaw`
        SELECT l.*, a."name" AS "agencyName", a."city" AS "agencyCity", a."email" AS "agencyEmail"
        FROM "PublicLead" l LEFT JOIN "Agency" a ON a."id"=l."agencyId"
        WHERE (${status || null}::text IS NULL OR l."status"=${status || null}) AND (${siteSlug || null}::text IS NULL OR l."siteSlug"=${siteSlug || null}) AND (${projectType || null}::text IS NULL OR l."projectType"=${projectType || null})
        ORDER BY l."createdAt" DESC LIMIT ${limit}`;
      const counts = await prisma.$queryRaw`SELECT "status", COUNT(*)::int AS "count" FROM "PublicLead" GROUP BY "status"`;
      return res.json({ ok: true, leads: rows, counts });
    } catch (error) { console.error("[leads] list failed", error); return res.status(500).json({ ok: false, error: "LEADS_LIST_FAILED" }); }
  });

  router.get("/api/leads/analytics", async (req, res) => {
    try {
      const days = Math.min(Math.max(Number(req.query.days || 30), 1), 365);
      const [summary] = await prisma.$queryRaw`SELECT COUNT(*)::int AS "total", COUNT(*) FILTER (WHERE "status"='NEW')::int AS "new", COUNT(*) FILTER (WHERE "status"='CONTACTED')::int AS "contacted", COUNT(*) FILTER (WHERE "status"='CONVERTED')::int AS "converted", COUNT(*) FILTER (WHERE "status"='CLOSED')::int AS "closed", COUNT(*) FILTER (WHERE "createdAt">=NOW()-(${days}*INTERVAL '1 day'))::int AS "periodTotal", COUNT(*) FILTER (WHERE "convertedAt">=NOW()-(${days}*INTERVAL '1 day'))::int AS "periodConverted", ROUND(AVG(EXTRACT(EPOCH FROM ("contactedAt"-"createdAt"))/3600.0) FILTER (WHERE "contactedAt" IS NOT NULL)::numeric,1) AS "avgContactHours", COUNT(*) FILTER (WHERE "nextActionAt" IS NOT NULL AND "nextActionAt"<=NOW() AND "status" NOT IN ('CONVERTED','CLOSED'))::int AS "followUpsDue" FROM "PublicLead"`;
      const agencies = await prisma.$queryRaw`SELECT l."agencyId",COALESCE(a."name",l."siteSlug") AS "agencyName",COALESCE(a."city",'') AS "agencyCity",COUNT(*)::int AS "total",COUNT(*) FILTER (WHERE l."status"='NEW')::int AS "new",COUNT(*) FILTER (WHERE l."status"='CONVERTED')::int AS "converted" FROM "PublicLead" l LEFT JOIN "Agency" a ON a."id"=l."agencyId" GROUP BY l."agencyId",a."name",a."city",l."siteSlug" ORDER BY COUNT(*) DESC,COALESCE(a."city",'') ASC`;
      const periodTotal=Number(summary?.periodTotal||0), periodConverted=Number(summary?.periodConverted||0);
      return res.json({ ok:true, days, summary:{...summary,total:Number(summary?.total||0),new:Number(summary?.new||0),contacted:Number(summary?.contacted||0),converted:Number(summary?.converted||0),closed:Number(summary?.closed||0),periodTotal,periodConverted,avgContactHours:summary?.avgContactHours===null?null:Number(summary.avgContactHours),conversionRate:periodTotal>0?Math.round((periodConverted/periodTotal)*1000)/10:0,followUpsDue:Number(summary?.followUpsDue||0)}, agencies });
    } catch(error){ console.error("[leads] analytics failed",error); return res.status(500).json({ok:false,error:"LEADS_ANALYTICS_FAILED"}); }
  });

  router.get("/api/leads/:id/notes", async (req,res)=>{
    const id=clean(req.params.id,120); if(!validLeadId(id)) return res.status(400).json({ok:false,error:"INVALID_LEAD_ID"});
    try { const notes=await prisma.$queryRaw`SELECT "id","leadId","content","author","createdAt" FROM "PublicLeadNote" WHERE "leadId"=${id} ORDER BY "createdAt" DESC LIMIT 100`; return res.json({ok:true,notes}); }
    catch(error){ console.error("[leads] notes list failed",error); return res.status(500).json({ok:false,error:"LEAD_NOTES_FAILED"}); }
  });
  router.post("/api/leads/:id/notes", async (req,res)=>{
    const id=clean(req.params.id,120), content=clean(req.body?.content,3000), author=clean(req.body?.author,120)||null;
    if(!validLeadId(id)) return res.status(400).json({ok:false,error:"INVALID_LEAD_ID"}); if(content.length<2) return res.status(400).json({ok:false,error:"INVALID_NOTE"});
    try { const exists=await prisma.$queryRaw`SELECT "id" FROM "PublicLead" WHERE "id"=${id} LIMIT 1`; if(!exists[0]) return res.status(404).json({ok:false,error:"LEAD_NOT_FOUND"});
      const rows=await prisma.$queryRaw`INSERT INTO "PublicLeadNote"("id","leadId","content","author","createdAt") VALUES(concat('note_',replace(gen_random_uuid()::text,'-','')),${id},${content},${author},NOW()) RETURNING *`;
      await prisma.$executeRaw`UPDATE "PublicLead" SET "lastNote"=${content},"lastNoteAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${id}`; return res.status(201).json({ok:true,note:rows[0]});
    } catch(error){ console.error("[leads] note create failed",error); return res.status(500).json({ok:false,error:"LEAD_NOTE_CREATE_FAILED"}); }
  });
  router.patch("/api/leads/:id/operations", async (req,res)=>{
    const id=clean(req.params.id,120), assignedTo=clean(req.body?.assignedTo,120)||null; const raw=req.body?.nextActionAt; let nextActionAt=null;
    if(!validLeadId(id)) return res.status(400).json({ok:false,error:"INVALID_LEAD_ID"});
    if(raw){ const d=new Date(raw); if(Number.isNaN(d.getTime())) return res.status(400).json({ok:false,error:"INVALID_NEXT_ACTION_AT"}); nextActionAt=d; }
    try { const rows=await prisma.$queryRaw`UPDATE "PublicLead" SET "assignedTo"=${assignedTo},"nextActionAt"=${nextActionAt},"updatedAt"=NOW() WHERE "id"=${id} RETURNING "id","assignedTo","nextActionAt","updatedAt"`; if(!rows[0]) return res.status(404).json({ok:false,error:"LEAD_NOT_FOUND"}); return res.json({ok:true,lead:rows[0]}); }
    catch(error){ console.error("[leads] operations update failed",error); return res.status(500).json({ok:false,error:"LEAD_OPERATIONS_UPDATE_FAILED"}); }
  });

  router.patch("/api/leads/:id/status", async (req,res)=>{
    const id=clean(req.params.id,120), status=clean(req.body?.status,20).toUpperCase(); if(!validLeadId(id)) return res.status(400).json({ok:false,error:"INVALID_LEAD_ID"}); if(!STATUSES.has(status)) return res.status(400).json({ok:false,error:"INVALID_STATUS"});
    try { const rows=await prisma.$queryRaw`UPDATE "PublicLead" SET "status"=${status},"contactedAt"=CASE WHEN ${status} IN ('CONTACTED','CONVERTED') AND "contactedAt" IS NULL THEN NOW() ELSE "contactedAt" END,"convertedAt"=CASE WHEN ${status}='CONVERTED' AND "convertedAt" IS NULL THEN NOW() ELSE "convertedAt" END,"closedAt"=CASE WHEN ${status}='CLOSED' AND "closedAt" IS NULL THEN NOW() ELSE "closedAt" END,"nextActionAt"=CASE WHEN ${status} IN ('CONVERTED','CLOSED') THEN NULL ELSE "nextActionAt" END,"updatedAt"=NOW() WHERE "id"=${id} RETURNING "id","status","contactedAt","convertedAt","closedAt","nextActionAt","updatedAt"`; if(!rows[0]) return res.status(404).json({ok:false,error:"LEAD_NOT_FOUND"}); return res.json({ok:true,lead:rows[0]}); }
    catch(error){ console.error("[leads] status update failed",error); return res.status(500).json({ok:false,error:"LEAD_STATUS_UPDATE_FAILED"}); }
  });
  router.post("/api/leads/:id/notify", async(req,res)=>{ const id=clean(req.params.id,120); if(!validLeadId(id)) return res.status(400).json({ok:false,error:"INVALID_LEAD_ID"}); try{const result=await notifyLead(prisma,id);if(!result.ok)return res.status(result.statusCode||500).json(result);return res.json(result);}catch(error){console.error("[leads] notify retry failed",error);return res.status(500).json({ok:false,error:"LEAD_NOTIFY_FAILED"});} });
  return router;
}
module.exports=createPublicLeadsRoutes; module.exports.validate=validate; module.exports.STATUSES=STATUSES; module.exports.notifyLead=notifyLead;
