#!/usr/bin/env node
"use strict";

const BASE_URL = process.env.MSE_25_124_BASE_URL || "http://127.0.0.1:4000";
const TENANT_SLUG = process.env.MSE_25_124_TENANT_SLUG || "mondescale";
const EXPECTED_ACK = "SYNC-GOOGLE-REVIEWS";
const SYNC_ACK = process.env.MSE_25_124_SYNC_ACK || "";

const sites = [
  {
    label: "Bois-Colombes",
    slug:
      process.env.MSE_25_124_BOIS_COLOMBES_SLUG ||
      "ambassade-fram-mondescale-bois-colombes",
  },
  {
    label: "Dax",
    slug:
      process.env.MSE_25_124_DAX_SLUG ||
      "ambassade-fram-mondescale-dax",
  },
  {
    label: "Gien",
    slug:
      process.env.MSE_25_124_GIEN_SLUG ||
      "ambassade-fram-mondescale-gien",
  },
];

function fail(message) {
  console.error(`[MSE-25.124A] FAIL: ${message}`);
  process.exitCode = 1;
}

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`non-JSON response from ${url}: HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(
      `${url}: HTTP ${response.status} ${JSON.stringify(body).slice(0, 500)}`
    );
  }

  return body;
}

async function syncReviews() {
  if (SYNC_ACK !== EXPECTED_ACK) {
    throw new Error(
      `set MSE_25_124_SYNC_ACK=${EXPECTED_ACK} to authorize the backend Google review sync`
    );
  }

  console.log("[MSE-25.124A] synchronizing Google reviews through backend...");
  const result = await readJson(`${BASE_URL}/google/import-reviews`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-tenant-slug": TENANT_SLUG,
    },
    body: "{}",
  });

  console.log(
    `[MSE-25.124A] sync complete: created=${result.created ?? result.imported ?? 0} updated=${result.updated ?? result.reconciled ?? 0} unchanged=${result.unchanged ?? result.skipped ?? 0}`
  );
}

async function readPublic(slug, limit) {
  return readJson(
    `${BASE_URL}/public/agency-sites/${encodeURIComponent(slug)}/reviews?limit=${limit}`,
    {
      headers: {
        Accept: "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
    }
  );
}

function normalizedSummary(payload) {
  return {
    total: Number(payload?.summary?.total || 0),
    averageRating: Number(payload?.summary?.averageRating || 0),
  };
}

async function verifySite(site) {
  const [three, six] = await Promise.all([
    readPublic(site.slug, 3),
    readPublic(site.slug, 6),
  ]);

  const summary3 = normalizedSummary(three);
  const summary6 = normalizedSummary(six);
  const cards3 = Array.isArray(three.reviews) ? three.reviews.length : -1;
  const cards6 = Array.isArray(six.reviews) ? six.reviews.length : -1;

  if (
    summary3.total !== summary6.total ||
    summary3.averageRating !== summary6.averageRating
  ) {
    fail(
      `${site.label}: public summary changes with limit (3=${JSON.stringify(summary3)}, 6=${JSON.stringify(summary6)})`
    );
    return;
  }

  if (summary3.total <= 0) {
    fail(`${site.label}: no synchronized reviews exposed by public API`);
    return;
  }

  if (cards3 > 3 || cards6 > 6) {
    fail(`${site.label}: display limit not respected (cards3=${cards3}, cards6=${cards6})`);
    return;
  }

  console.log(
    `[MSE-25.124A] PASS ${site.label}: total=${summary3.total} rating=${summary3.averageRating} cards(limit=3)=${cards3} cards(limit=6)=${cards6}`
  );
}

async function main() {
  console.log(`[MSE-25.124A] base=${BASE_URL} tenant=${TENANT_SLUG}`);
  await syncReviews();

  for (const site of sites) {
    await verifySite(site);
  }

  if (process.exitCode) {
    throw new Error("runtime review validation failed");
  }

  console.log("[MSE-25.124A] runtime validation complete");
}

main().catch((error) => {
  fail(error.message);
});
