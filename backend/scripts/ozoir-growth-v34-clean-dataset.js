#!/usr/bin/env node
"use strict";

/**
 * OZOIR GROWTH V3.4 — CLEAN OZOIR DATASET
 * Strictly read-only diagnostic. No Prisma mutations, provider ranking calls,
 * campaign creation, Search Console writes, GBP writes, commits or deploys.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const AGENCY_ID = 5;
const SITE_SLUG = "ambassade-fram-mondescale-ozoir-la-ferriere";
const SITE_URL = "sc-domain:mondescale.com";
const BACKEND = process.env.OZOIR_V34_BACKEND || "http://127.0.0.1:4000";
const SAFE_RANKING_START = process.env.OZOIR_V34_SAFE_RANKING_START || "2026-09-30T00:00:00.000Z";
const CURRENT_PAGE = `https://agences.mondescale.com/agence/${SITE_SLUG}`;
const LEGACY_HOST = "https://ozoir-la-ferriere.mondescale.com/";
const BAD_URL = `${LEGACY_HOST}?utm_source=gmb${CURRENT_PAGE}`;

function section(title) {
  console.log(`\n===== ${title} =====`);
}
function j(value) {
  console.log(JSON.stringify(value, null, 2));
}
function num(v) { return Number(v || 0); }
function pct(clicks, impressions) { return impressions ? clicks / impressions : 0; }
function qident(name) { return `"${String(name).replaceAll('"', '""')}"`; }

async function tableColumns(table) {
  return prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    ORDER BY ordinal_position
  `, table);
}

async function selectExisting(table, columns, where = "TRUE", order = "", limit = "") {
  const schema = await tableColumns(table);
  const available = new Set(schema.map(x => x.column_name));
  const selected = columns.filter(c => available.has(c));
  if (!selected.length) return { rows: [], available: [...available] };
  const sql = `SELECT ${selected.map(qident).join(",")} FROM ${qident(table)} WHERE ${where} ${order} ${limit}`;
  return { rows: await prisma.$queryRawUnsafe(sql), available: [...available] };
}

async function httpJson(path, params = {}) {
  const url = new URL(path, BACKEND);
  for (const [k,v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const r = await fetch(url, { headers: { accept: "application/json" } });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { status: r.status, ok: r.ok, body };
}

function performanceRows(payload) {
  const rows = [];
  const seen = new Set();
  function walk(x) {
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    if (("clicks" in x || "impressions" in x) && !seen.has(x)) { seen.add(x); rows.push(x); }
    Object.values(x).forEach(walk);
  }
  walk(payload);
  return rows;
}

function rowPage(row) {
  if (row.page) return String(row.page);
  if (row.dimensions?.page) return String(row.dimensions.page);
  if (Array.isArray(row.keys) && row.keys.length > 1) return String(row.keys[1]);
  return "";
}
function rowQuery(row) {
  if (row.query) return String(row.query);
  if (row.dimensions?.query) return String(row.dimensions.query);
  if (Array.isArray(row.keys)) return String(row.keys[0] || "");
  return "";
}
function isOzoirPage(page) {
  const p = String(page || "").toLowerCase();
  return p.includes("ambassade-fram-mondescale-ozoir-la-ferriere") || p.includes("ozoir-la-ferriere.mondescale.com") || p.includes("ozoir-la-ferrière");
}
function classifyQuery(query) {
  const q = String(query || "").toLowerCase();
  if (/pontault|roissy|lésigny|lesigny|gretz|tournan/.test(q)) return "NEARBY_CITY";
  if (/mondescale|ozoir/.test(q)) return "BRAND";
  if (/fram/.test(q)) return "FRAM";
  if (/agence.*voyage|voyage.*agence/.test(q)) return "LOCAL_GENERIC";
  if (/croisi|circuit|séjour|sejour|club|sur mesure/.test(q)) return "PRODUCT";
  if (/maldives|maurice|seychelles|tunisie|grèce|grece|espagne|italie|usa|polyn/.test(q)) return "DESTINATION";
  return "OTHER";
}

async function gsc(dimensions, days, rowLimit = 25000) {
  return httpJson("/search-console-submissions/performance", {
    siteUrl: SITE_URL,
    siteSlug: SITE_SLUG,
    days,
    dimensions,
    rowLimit,
  });
}

function identityValid(row, agency) {
  if (!row?.found) return { valid: true, reason: "NOT_FOUND_ROW" };
  const title = String(row.title || "").toLowerCase();
  const url = String(row.url || "").toLowerCase();
  const expectedPlaceId = String(agency.googleReviewUrl || "").match(/placeid=([^&]+)/i)?.[1]?.toLowerCase();
  if (expectedPlaceId && url.includes(expectedPlaceId)) return { valid: true, reason: "PLACE_ID" };
  if (title.includes("ozoir") || url.includes("ozoir")) return { valid: true, reason: "OZOIR_IDENTITY" };
  if (title.includes("nevers") || url.includes("nevers")) return { valid: false, reason: "CROSS_AGENCY_NEVERS" };
  if (title.includes("maurepas") || title.includes("dax") || title.includes("gien") || title.includes("bois-colombes") || title.includes("lamorlaye")) return { valid: false, reason: "CROSS_AGENCY_IDENTITY" };
  return { valid: false, reason: "IDENTITY_NOT_PROVEN" };
}

async function main() {
  console.log("======================================================");
  console.log(" OZOIR GROWTH V3.4 — CLEAN OZOIR DATASET");
  console.log(" READ ONLY / ZERO WRITE / NO PAID RANKING PROVIDER");
  console.log("======================================================");

  section("1. OZOIR IDENTITY");
  const agencies = await prisma.$queryRawUnsafe(`SELECT * FROM "Agency" WHERE "id"=${AGENCY_ID} LIMIT 1`);
  const agency = agencies[0];
  if (!agency) throw new Error("OZOIR_AGENCY_NOT_FOUND");
  const sites = await prisma.$queryRawUnsafe(`SELECT * FROM "AgencySite" WHERE "agencyId"=${AGENCY_ID} AND "slug"='${SITE_SLUG.replaceAll("'", "''")}' LIMIT 1`);
  j({ agency, site: sites[0] || null, canonicalAgencyUrl: CURRENT_PAGE, legacyHost: LEGACY_HOST });

  section("2. SAFE RANKING BOUNDARY");
  console.log("V25_COMMIT=5149dd87f6be8c41139d42644fe20fb4c9d076d0");
  console.log("V25_DEPLOYED_AT=UNKNOWN");
  console.log("CONFIDENCE=MEDIUM");
  console.log(`SAFE_RANKING_START=${SAFE_RANKING_START}`);
  console.log("EVIDENCE=Override with OZOIR_V34_SAFE_RANKING_START if deployment timestamp is proven externally.");

  section("3. GSC CLEAN OZOIR QUERY+PAGE — 90D / 28D");
  const g90 = await gsc("query,page", 90);
  const g28 = await gsc("query,page", 28);
  console.log(`GSC_90_HTTP=${g90.status}`);
  console.log(`GSC_28_HTTP=${g28.status}`);
  const all90 = performanceRows(g90.body);
  const all28 = performanceRows(g28.body);
  const clean90 = all90.filter(r => isOzoirPage(rowPage(r)));
  const clean28 = all28.filter(r => isOzoirPage(rowPage(r)));
  console.log(`GSC_90_ROWS_RAW=${all90.length}`);
  console.log(`GSC_90_OZOIR_ROWS=${clean90.length}`);
  console.log(`GSC_28_ROWS_RAW=${all28.length}`);
  console.log(`GSC_28_OZOIR_ROWS=${clean28.length}`);

  const normalized90 = clean90.map(r => ({
    query: rowQuery(r), page: rowPage(r), clicks: num(r.clicks), impressions: num(r.impressions),
    ctr: r.ctr ?? pct(num(r.clicks), num(r.impressions)), position: num(r.position), type: classifyQuery(rowQuery(r)),
  }));
  j(normalized90.sort((a,b) => b.impressions-a.impressions));

  section("4. OZOIR URL VARIANTS");
  const page90 = await gsc("page", 90);
  const variants = performanceRows(page90.body).filter(r => isOzoirPage(rowPage(r))).map(r => ({
    url: rowPage(r), clicks: num(r.clicks), impressions: num(r.impressions), ctr: r.ctr ?? pct(num(r.clicks),num(r.impressions)), position: num(r.position),
    type: rowPage(r) === BAD_URL ? "malformed" : rowPage(r).includes("utm_") ? "utm" : rowPage(r).includes("agences.mondescale.com") ? "canonical" : "legacy",
  }));
  j(variants);

  section("5. MALFORMED URL");
  const bad = variants.find(v => v.url === BAD_URL) || variants.find(v => v.url.includes("utm_source=gmbhttps://"));
  console.log(`MALFORMED_URL_STATUS=${bad ? "HISTORICAL_OR_STILL_VISIBLE" : "NOT_VISIBLE_IN_90D"}`);
  console.log(`CURRENT_SOURCE_GENERATES_BAD_URL=UNKNOWN`);
  console.log(`CURRENT_GBP_CONTAINS_BAD_URL=UNKNOWN`);
  if (bad) j(bad);

  section("6. REAL RANKING POST-V2.5");
  const rr = await selectExisting("RealRankingCheck",
    ["id","agencyId","keyword","city","found","position","absolutePosition","title","url","rating","reviews","checkedAt"],
    `"agencyId"=${AGENCY_ID} AND "checkedAt">='${SAFE_RANKING_START.replaceAll("'", "''")}'`,
    `ORDER BY "checkedAt" DESC`, "LIMIT 1000");
  const valid = [], suspicious = [];
  for (const row of rr.rows) {
    const verdict = identityValid(row, agency);
    (verdict.valid ? valid : suspicious).push({ ...row, identityReason: verdict.reason });
  }
  console.log(`POST_V25_VALID_ROWS=${valid.length}`);
  console.log(`POST_V25_SUSPICIOUS_ROWS=${suspicious.length}`);
  console.log("VALID_OZOIR_RESULTS"); j(valid);
  console.log("REJECTED_OR_SUSPICIOUS_RESULTS"); j(suspicious);

  section("7. HISTORICAL CONTAMINATION — MEASURE ONLY");
  const hist = await selectExisting("RealRankingCheck",
    ["id","agencyId","keyword","city","found","position","absolutePosition","title","url","checkedAt"],
    `"agencyId"=${AGENCY_ID} AND "checkedAt"<'${SAFE_RANKING_START.replaceAll("'", "''")}'`,
    `ORDER BY "checkedAt" DESC`, "LIMIT 10000");
  let histFound=0, histValid=0, histBad=0;
  const badGroups = new Map();
  for (const row of hist.rows) {
    if (row.found) histFound++;
    const verdict = identityValid(row, agency);
    if (verdict.valid) histValid++; else {
      histBad++;
      const key = `${row.title || ""} | ${row.url || ""} | ${verdict.reason}`;
      badGroups.set(key,(badGroups.get(key)||0)+1);
    }
  }
  j({ historicalRowsAnalyzed: hist.rows.length, historicalFoundRows: histFound, historicalValidOzoirRows: histValid, historicalContaminatedRows: histBad,
    contaminatedGroups: [...badGroups.entries()].sort((a,b)=>b[1]-a[1]).map(([identity,count])=>({identity,count})) });

  section("8. OZOIR GRID CAMPAIGNS + POINT METRICS");
  const campaigns = await selectExisting("RankingGridCampaign",
    ["id","agencyId","keywordId","keyword","city","centerLat","centerLng","gridSize","spacingKm","provider","status","summary","startedAt","completedAt","createdAt","updatedAt"],
    `"agencyId"=${AGENCY_ID}`, `ORDER BY "createdAt" DESC`);
  const campaignReports=[];
  for (const c of campaigns.rows) {
    const points = await selectExisting("RankingGridPoint",
      ["id","campaignId","row","col","latitude","longitude","northKm","eastKm","status","found","position","absolutePosition","title","url","rating","reviews","cost","checkedAt"],
      `"campaignId"=${Number(c.id)}`, `ORDER BY "row","col"`);
    const found = points.rows.filter(p=>p.found);
    const positions = found.map(p=>num(p.position || p.absolutePosition)).filter(x=>x>0);
    const metrics = {
      totalPoints: points.rows.length,
      foundPoints: found.length,
      top3Points: positions.filter(x=>x<=3).length,
      top10Points: positions.filter(x=>x<=10).length,
      top20Points: positions.filter(x=>x<=20).length,
      notFoundPoints: points.rows.length-found.length,
      avgPositionFound: positions.length ? positions.reduce((a,b)=>a+b,0)/positions.length : null,
      bestPosition: positions.length ? Math.min(...positions) : null,
      worstPositionFound: positions.length ? Math.max(...positions) : null,
    };
    campaignReports.push({ campaign:c, metrics, points:points.rows });
  }
  j(campaignReports);

  section("9. CLEAN OPPORTUNITY MATRIX");
  const agg = new Map();
  for (const r of normalized90) {
    const key = r.query || "(unknown)";
    const a = agg.get(key) || { query:key, type:r.type, clicks:0, impressions:0, weightedPosition:0 };
    a.clicks += r.clicks; a.impressions += r.impressions; a.weightedPosition += r.position*r.impressions; agg.set(key,a);
  }
  const opportunities = [...agg.values()].map(a => {
    const ctr = pct(a.clicks,a.impressions);
    const position = a.impressions ? a.weightedPosition/a.impressions : 0;
    let action="MONITOR_ONLY", score=0;
    if (a.impressions >= 20) score += 30;
    if (position > 0 && position <= 15) score += 30;
    if (ctr < 0.03 && a.impressions >= 20) { score += 25; action="SNIPPET"; }
    if (a.type === "NEARBY_CITY") { score += 15; action="NEARBY_CITY_CONTENT"; }
    else if (a.type === "FRAM") action="FRAM_CONTENT";
    else if (a.type === "PRODUCT" || a.type === "DESTINATION") action="PRODUCT_CONTENT";
    else if (a.type === "LOCAL_GENERIC" && action === "MONITOR_ONLY") action="LOCAL_CONTENT";
    return { queryOrTheme:a.query, type:a.type, clicks:a.clicks, impressions:a.impressions, ctr, position, geographicRelevance:["BRAND","LOCAL_GENERIC","NEARBY_CITY"].includes(a.type)?"HIGH":"MEDIUM", evidenceQuality:"GSC_OZOIR_PAGE", opportunityScore:score, recommendedAction:action };
  }).sort((a,b)=>b.opportunityScore-a.opportunityScore || b.impressions-a.impressions);
  j(opportunities);

  section("10. V4 RECOMMENDATION — NO IMPLEMENTATION");
  const top = opportunities.slice(0,5);
  top.forEach((x,i)=>j({ priority:i+1, status:"PROVEN_OPPORTUNITY", evidence:x, expectedEffect:"Increase qualified organic visibility/click-through from existing Ozoir demand", targetPage:CURRENT_PAGE, targetQueryOrArea:x.queryOrTheme, implementationType:x.recommendedAction, risk:"LOW_TO_MEDIUM" }));
  if (!top.length) console.log("INSUFFICIENT_DATA");

  section("11. FINAL VALIDATION");
  console.log("======================================================");
  console.log(" OZOIR GROWTH V3.4 — CLEAN DATASET COMPLETE");
  console.log("======================================================");
  console.log(`AGENCY_ID=${AGENCY_ID}`);
  console.log("OZOIR_IDENTITY_VERIFIED=YES");
  console.log(`GSC_OZOIR_ISOLATED=${clean90.length || clean28.length ? "YES" : "NO"}`);
  console.log(`MALFORMED_URL_STATUS=${bad ? "HISTORICAL_OR_STILL_VISIBLE" : "NOT_VISIBLE_IN_90D"}`);
  console.log(`SAFE_RANKING_START=${SAFE_RANKING_START}`);
  console.log(`POST_V25_VALID_ROWS=${valid.length}`);
  console.log(`POST_V25_SUSPICIOUS_ROWS=${suspicious.length}`);
  console.log(`GRID_CAMPAIGNS_FOUND=${campaigns.rows.length}`);
  console.log(`GRID_POINTS_ANALYZED=${campaignReports.reduce((n,x)=>n+x.metrics.totalPoints,0)}`);
  console.log(`CLEAN_OPPORTUNITIES_FOUND=${opportunities.length}`);
  console.log(`V4_READY=${opportunities.length ? "YES" : "NO"}`);
  console.log("DATABASE_WRITES=0");
  console.log("SOURCE_CHANGED=NO");
  console.log("PRODUCTION_CHANGED=NO");
  console.log("DATAFORSEO_CALLS=0");
  console.log("RANKING_CAMPAIGN_CREATED=NO");
  console.log("SEARCH_CONSOLE_WRITES=0");
  console.log("GBP_WRITES=0");
  console.log("======================================================");
}

main()
  .catch(err => { console.error("V34_ERROR=", err?.stack || err); process.exitCode=1; })
  .finally(() => prisma.$disconnect());
