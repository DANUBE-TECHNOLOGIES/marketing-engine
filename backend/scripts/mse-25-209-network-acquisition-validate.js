"use strict";

const { Pool } = require("pg");
const {
  FUNNEL_VERSION,
  NETWORK_AGENCIES,
} = require("../src/modules/acquisition-funnel");

const BASE_URL = (process.env.ACQUISITION_VALIDATION_BASE_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
const DAYS = Math.min(Math.max(Number(process.env.ACQUISITION_VALIDATION_DAYS || 30), 1), 365);
const DATABASE_URL = process.env.ACQUISITION_VALIDATION_DATABASE_URL || process.env.DATABASE_URL || "";

const PERSONAS = Object.freeze({
  HOT: {
    phone: "0612345678",
    consents: { phoneProjectContact: true, emailMarketing: false },
    answers: {
      departureWindow: "decembre",
      travellers: "2",
      budgetPerPerson: "5000-plus",
      travelStyle: "plage",
      departureAirport: "paris",
      maturity: "reservation-prochaine",
    },
    expected: { temperature: "HOT", score: 100, recommendedAction: "CONTACT_PRIORITY" },
  },
  WARM: {
    consents: { phoneProjectContact: false, emailMarketing: false },
    answers: {
      departureWindow: "janvier",
      travellers: "2",
      budgetPerPerson: "2000-3000",
      travelStyle: "circuit",
      departureAirport: "paris",
      maturity: "comparaison",
    },
    expected: { temperature: "WARM", score: 62, recommendedAction: "CONTACT_OR_NURTURE" },
  },
  COLD: {
    consents: { phoneProjectContact: false, emailMarketing: false },
    answers: {
      departureWindow: "pas-encore-decide",
      travellers: "1",
      budgetPerPerson: "a-definir",
      travelStyle: "a-decouvrir",
      departureAirport: "a-definir",
      maturity: "idees",
    },
    expected: { temperature: "COLD", score: 11, recommendedAction: "NURTURE" },
  },
});

function fail(message) {
  const error = new Error(message);
  error.code = "MSE_25_209_VALIDATION_FAILED";
  throw error;
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) fail(`${path} -> HTTP ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function validateRegistryAndScoring() {
  const rows = [];
  for (const agency of NETWORK_AGENCIES) {
    const publicPath = `/api/public/acquisition-funnels/${agency.publicSiteSlug}/soleil-hiver`;
    const registry = await requestJson(publicPath);
    const funnel = registry?.funnel;
    if (!registry?.ok || !funnel) fail(`Funnel absent pour ${agency.publicSiteSlug}`);
    if (funnel.siteSlug !== agency.siteSlug) fail(`siteSlug incorrect pour ${agency.publicSiteSlug}`);
    if (funnel.publicSiteSlug !== agency.publicSiteSlug) fail(`publicSiteSlug incorrect pour ${agency.publicSiteSlug}`);
    if (funnel.agencyCity !== agency.agencyCity) fail(`agencyCity incorrect pour ${agency.publicSiteSlug}`);
    if (funnel.version !== FUNNEL_VERSION) fail(`version incorrecte pour ${agency.publicSiteSlug}`);
    if (!Array.isArray(funnel.questions) || funnel.questions.length !== 6) fail(`questions incorrectes pour ${agency.publicSiteSlug}`);

    for (const [name, persona] of Object.entries(PERSONAS)) {
      const qualified = await requestJson(`${publicPath}/qualify`, {
        method: "POST",
        body: JSON.stringify(persona),
      });
      const q = qualified?.qualification;
      if (!qualified?.ok || !q) fail(`Qualification absente ${agency.publicSiteSlug}/${name}`);
      for (const [key, expected] of Object.entries(persona.expected)) {
        if (q[key] !== expected) fail(`${agency.publicSiteSlug}/${name} ${key}: attendu ${expected}, reçu ${q[key]}`);
      }
    }

    rows.push({ agency: agency.agencyCity, publicSiteSlug: agency.publicSiteSlug, siteSlug: agency.siteSlug, registry: "PASS", scoring: "PASS" });
  }
  return rows;
}

async function readAnalyticsApi() {
  const data = await requestJson(`/api/leads/acquisition/analytics?days=${DAYS}`);
  if (!data?.ok || !Array.isArray(data.funnels)) fail("Analytics API invalide");
  const totals = data.funnels.reduce((acc, row) => {
    for (const key of ["leads", "hot", "warm", "cold", "contacted", "converted"]) acc[key] += Number(row[key] || 0);
    return acc;
  }, { leads: 0, hot: 0, warm: 0, cold: 0, contacted: 0, converted: 0 });
  return { ...data, totals };
}

async function readDatabaseEvidence() {
  if (!DATABASE_URL) return { enabled: false, reason: "DATABASE_URL absent" };
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const sites = await pool.query(
      `SELECT "slug","agencyId","id" FROM "AgencySite" WHERE "slug" = ANY($1::text[]) ORDER BY "slug"`,
      [NETWORK_AGENCIES.map((agency) => agency.siteSlug)]
    );
    const found = new Set(sites.rows.map((row) => row.slug));
    const missing = NETWORK_AGENCIES.filter((agency) => !found.has(agency.siteSlug)).map((agency) => agency.siteSlug);
    if (missing.length) fail(`AgencySite absents: ${missing.join(", ")}`);

    const leadRows = await pool.query(
      `SELECT
         "siteSlug",
         COUNT(*)::int AS "leads",
         COUNT(*) FILTER (WHERE "leadTemperature"='HOT')::int AS "hot",
         COUNT(*) FILTER (WHERE "leadTemperature"='WARM')::int AS "warm",
         COUNT(*) FILTER (WHERE "leadTemperature"='COLD')::int AS "cold",
         COUNT(*) FILTER (WHERE "notificationStatus"='SENT')::int AS "notificationSent",
         COUNT(*) FILTER (WHERE "notificationStatus"='FAILED')::int AS "notificationFailed",
         COUNT(*) FILTER (WHERE COALESCE(("consentEvidence"->>'phoneProjectContact')::boolean,false)=true)::int AS "phoneConsentYes",
         COUNT(*) FILTER (WHERE COALESCE(("consentEvidence"->>'emailMarketing')::boolean,false)=true)::int AS "emailMarketingYes"
       FROM "PublicLead"
       WHERE "funnelId" IS NOT NULL
         AND "createdAt" >= NOW() - ($1 * INTERVAL '1 day')
         AND "siteSlug" = ANY($2::text[])
       GROUP BY "siteSlug"
       ORDER BY "siteSlug"`,
      [DAYS, NETWORK_AGENCIES.map((agency) => agency.siteSlug)]
    );

    return { enabled: true, sites: sites.rows, leads: leadRows.rows };
  } finally {
    await pool.end();
  }
}

function renderTable(rows) {
  const headers = ["Agence", "Public slug", "Registry", "Scoring"];
  const data = rows.map((row) => [row.agency, row.publicSiteSlug, row.registry, row.scoring]);
  const widths = headers.map((header, i) => Math.max(header.length, ...data.map((row) => String(row[i]).length)));
  const line = (row) => row.map((cell, i) => String(cell).padEnd(widths[i])).join("  ");
  return [line(headers), line(widths.map((w) => "-".repeat(w))), ...data.map(line)].join("\n");
}

async function main() {
  console.log("======================================================");
  console.log(" MSE-25.209 — NETWORK ACQUISITION VALIDATION");
  console.log("======================================================");
  console.log(`Base URL : ${BASE_URL}`);
  console.log(`Fenêtre  : ${DAYS} jours`);
  console.log("Mode     : lecture seule / aucune soumission de lead / aucun e-mail déclenché");
  console.log();

  const registry = await validateRegistryAndScoring();
  console.log(renderTable(registry));

  const analytics = await readAnalyticsApi();
  console.log();
  console.log("===== ANALYTICS API =====");
  console.log(JSON.stringify(analytics.totals, null, 2));

  const database = await readDatabaseEvidence();
  console.log();
  console.log("===== DATABASE EVIDENCE =====");
  if (!database.enabled) {
    console.log(database.reason);
  } else {
    console.log(`AgencySite validés : ${database.sites.length}/${NETWORK_AGENCIES.length}`);
    console.table(database.leads);
  }

  const report = {
    ok: true,
    mse: "MSE-25.209",
    validatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    days: DAYS,
    funnelVersion: FUNNEL_VERSION,
    agencies: registry,
    analytics: analytics.totals,
    database,
  };

  if (process.env.ACQUISITION_VALIDATION_REPORT) {
    const fs = require("node:fs");
    fs.writeFileSync(process.env.ACQUISITION_VALIDATION_REPORT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Rapport JSON : ${process.env.ACQUISITION_VALIDATION_REPORT}`);
  }

  console.log();
  console.log("MSE-25.209 VALIDATION SUCCESS");
}

main().catch((error) => {
  console.error("MSE-25.209 VALIDATION FAILED");
  console.error(error.stack || error.message || error);
  process.exit(1);
});
