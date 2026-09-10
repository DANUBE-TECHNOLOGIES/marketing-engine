"use strict";

const TARGET_SITE = "mondescale-lamorlaye";
const TARGET_PAGES = ["agence", "equipe"];
const BACKEND = String(process.env.MSE_25_198_BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");
const FRONTEND = String(process.env.MSE_25_198_FRONTEND_URL || "http://mle_frontend:3000").replace(/\/+$/, "");
const PUBLIC = String(process.env.MSE_25_198_PUBLIC_ORIGIN || "https://agences.mondescale.com").replace(/\/+$/, "");

async function probe(url, options = {}) {
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      ...options,
    });
    const text = await response.text();
    return {
      url,
      ok: response.ok,
      status: response.status,
      location: response.headers.get("location"),
      contentType: response.headers.get("content-type"),
      preview: text.replace(/\s+/g, " ").slice(0, 220),
    };
  } catch (error) {
    return { url, ok: false, error: error.message };
  }
}

async function main() {
  const headers = { accept: "application/json", "x-tenant-slug": "mondescale" };
  const backend = await probe(`${BACKEND}/api/public-site-read/sites/${TARGET_SITE}`, { headers });
  let contract = null;
  if (backend.status === 200) {
    const response = await fetch(`${BACKEND}/api/public-site-read/sites/${TARGET_SITE}`, { headers, signal: AbortSignal.timeout(12000) });
    contract = await response.json();
  }

  const pages = Array.isArray(contract?.pages) ? contract.pages : [];
  const navigation = Array.isArray(contract?.navigation) ? contract.navigation : [];
  const pageState = TARGET_PAGES.map((slug) => {
    const page = pages.find((candidate) => String(candidate?.slug || "").toLowerCase() === slug);
    const nav = navigation.find((candidate) => String(candidate?.slug || "").toLowerCase() === slug);
    return {
      slug,
      exposedByBackend: Boolean(page),
      backendStatus: page?.status ?? null,
      backendPublished: page?.published ?? null,
      blocks: Array.isArray(page?.blocks) ? page.blocks.length : null,
      navigationPath: nav?.path || nav?.href || null,
    };
  });

  const routeProbes = {};
  for (const slug of TARGET_PAGES) {
    const path = `/agence/${TARGET_SITE}/${slug}`;
    routeProbes[slug] = {
      frontendInternal: await probe(`${FRONTEND}${path}`),
      publicOrigin: await probe(`${PUBLIC}${path}`),
    };
  }

  console.log(JSON.stringify({
    mse: "25.198",
    mode: "DIAGNOSTIC_ONLY",
    writes: 0,
    target: TARGET_SITE,
    backendContract: {
      status: backend.status ?? null,
      error: backend.error || null,
      pageCount: pages.length,
      navigationCount: navigation.length,
      pages: pageState,
    },
    routeProbes,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
