"use strict";

function normalizeOrigin(value) {
  return String(value || "http://127.0.0.1:4000").trim().replace(/\/+$/g, "");
}

function validatePreview(payload) {
  if (payload?.readOnly !== true || payload?.writes !== false || payload?.destructive !== false) {
    const error = new Error("Le preview réseau MSE-25.40 doit rester strictement read-only.");
    error.code = "MSE_25_40_UNSAFE_PREVIEW";
    throw error;
  }
  if (!/^[0-9a-f]{64}$/i.test(String(payload?.planFingerprint || ""))) {
    const error = new Error("Le preview MSE-25.40 doit fournir un fingerprint SHA-256 valide.");
    error.code = "MSE_25_40_FINGERPRINT_INVALID";
    throw error;
  }
  if (payload?.policy?.managedRoutesAware !== true) {
    const error = new Error("Le preview MSE-25.40 doit intégrer les routes canoniques gérées à la couverture sémantique.");
    error.code = "MSE_25_40_MANAGED_ROUTES_NOT_AWARE";
    throw error;
  }
  if (payload?.policy?.automaticWrites !== false || (payload?.summary?.automaticWriteCount || 0) !== 0) {
    const error = new Error("Le preview MSE-25.40 ne doit exposer aucune écriture automatique.");
    error.code = "MSE_25_40_AUTOMATIC_WRITE_EXPOSED";
    throw error;
  }
  return payload;
}

async function runHttp({ backendOrigin, tenantSlug, request = fetch } = {}) {
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const response = await request(`${origin}/minisite-semantic-engine/network/preview`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tenant-slug": tenantSlug },
    body: "{}",
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_40_NETWORK_PREVIEW_FAILED";
    error.details = payload?.details || {};
    throw error;
  }
  return validatePreview(payload);
}

async function runDirect({ tenantSlug, envFile = process.env.MSE_25_40_ENV_FILE } = {}) {
  const dotenv = require("dotenv");
  const dotenvOptions = { quiet: true };
  if (envFile) dotenvOptions.path = envFile;
  dotenv.config(dotenvOptions);
  const { PrismaClient } = require("@prisma/client");
  const { MiniSiteSemanticEngineService } = require("../src/modules/minisite-semantic-engine/service");
  const prisma = new PrismaClient();
  try {
    const service = new MiniSiteSemanticEngineService({ prisma });
    return validatePreview(await service.previewNetwork({ tenantSlug }));
  } finally {
    await prisma.$disconnect();
  }
}

async function run({ backendOrigin, tenantSlug = process.env.TENANT_SLUG || "mondescale", emitOutput = true, request = fetch, mode = process.env.MSE_25_40_PREVIEW_MODE || "direct", envFile = process.env.MSE_25_40_ENV_FILE } = {}) {
  const normalizedMode = String(mode || "direct").trim().toLowerCase();
  const payload = normalizedMode === "http"
    ? await runHttp({ backendOrigin, tenantSlug, request })
    : await runDirect({ tenantSlug, envFile });
  if (emitOutput) console.log(JSON.stringify(payload, null, 2));
  return payload;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_NETWORK_PREVIEW_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { normalizeOrigin, run, runDirect, runHttp, validatePreview };
