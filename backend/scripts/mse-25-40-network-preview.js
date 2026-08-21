"use strict";

function normalizeOrigin(value) {
  return String(value || "http://127.0.0.1:4000").trim().replace(/\/+$/g, "");
}

async function run({ backendOrigin, tenantSlug = "mondescale", emitOutput = true, request = fetch } = {}) {
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const response = await request(`${origin}/minisite-semantic-engine/network/preview`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tenant-slug": tenantSlug || process.env.TENANT_SLUG || "mondescale" },
    body: "{}",
  });
  const payload = await response.json();
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.message || `HTTP ${response.status}`);
    error.code = payload?.error || "MSE_25_40_NETWORK_PREVIEW_FAILED";
    error.details = payload?.details || {};
    throw error;
  }
  if (payload.readOnly !== true || payload.writes !== false || payload.destructive !== false) {
    const error = new Error("Le preview réseau MSE-25.40 doit rester strictement read-only.");
    error.code = "MSE_25_40_UNSAFE_PREVIEW";
    throw error;
  }
  if (!/^[0-9a-f]{64}$/i.test(String(payload.planFingerprint || ""))) {
    const error = new Error("Le preview MSE-25.40 doit fournir un fingerprint SHA-256 valide.");
    error.code = "MSE_25_40_FINGERPRINT_INVALID";
    throw error;
  }
  if (emitOutput) console.log(JSON.stringify(payload, null, 2));
  return payload;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_NETWORK_PREVIEW_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { normalizeOrigin, run };
