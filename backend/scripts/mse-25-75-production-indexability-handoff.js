#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");

const REQUIRED_COMMIT = process.env.MSE_25_75_REQUIRED_COMMIT || "733a48529ca4e8fdc91e34f2a5633a857a3e4dfd";
const BACKEND_URL = String(process.env.MSE_25_75_BACKEND_URL || "http://127.0.0.1:4000").replace(/\/+$/g, "");
const PUBLIC_ORIGIN = String(process.env.PUBLIC_SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com").replace(/\/+$/g, "");
const TIMEOUT_MS = Math.max(1000, Number(process.env.MSE_25_75_TIMEOUT_MS || 10000));

function git(args) {
  return execFileSync("git", args, { cwd: require("node:path").resolve(__dirname, "../.."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readGitState() {
  let head = null;
  let containsRequiredCommit = false;
  let error = null;
  try {
    head = git(["rev-parse", "HEAD"]);
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", REQUIRED_COMMIT, head], {
        cwd: require("node:path").resolve(__dirname, "../.."),
        stdio: "ignore",
      });
      containsRequiredCommit = true;
    } catch (_error) {
      containsRequiredCommit = false;
    }
  } catch (gitError) {
    error = gitError?.message || String(gitError);
  }
  return { head, requiredCommit: REQUIRED_COMMIT, containsRequiredCommit, error };
}

function parseHeaders() {
  const raw = String(process.env.MSE_25_75_HEADERS_JSON || "").trim();
  if (!raw) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error("MSE_25_75_HEADERS_JSON must contain a JSON object.");
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [String(key), String(value)]));
}

async function fetchProbe(url, { headers = {}, accept = "application/json,*/*;q=0.1" } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: accept, "User-Agent": "Mondescale-MSE-25.75/1.0", ...headers },
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_error) {}
    return {
      url,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url || url,
      contentType: response.headers.get("content-type") || null,
      json,
      bodyPreview: json ? null : text.slice(0, 300),
      error: null,
    };
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      finalUrl: null,
      contentType: null,
      json: null,
      bodyPreview: null,
      error: error?.name === "AbortError" ? "timeout" : error?.message || String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function classify({ gitState, health, readiness, sitemap, robots }) {
  const blockers = [];
  const warnings = [];

  if (gitState.error) warnings.push("GIT_STATE_UNAVAILABLE");
  if (!gitState.containsRequiredCommit) blockers.push("REQUIRED_COMMIT_NOT_DEPLOYED");

  if (health.status === 401 || health.status === 403 || readiness.status === 401 || readiness.status === 403) {
    return { verdict: "AUTH_REQUIRED", ready: false, blockers: [...blockers, "RUNTIME_AUTH_REQUIRED"], warnings };
  }

  if (health.error || health.status === null) blockers.push("BACKEND_UNREACHABLE");
  else if (health.status === 404) blockers.push("SEARCH_CONSOLE_HEALTH_ROUTE_MISSING");
  else if (!health.ok) blockers.push("SEARCH_CONSOLE_HEALTH_FAILED");

  if (readiness.error || readiness.status === null) blockers.push("RUNTIME_READINESS_UNREACHABLE");
  else if (readiness.status === 404) blockers.push("RUNTIME_READINESS_ROUTE_MISSING");
  else if (!readiness.ok) blockers.push("RUNTIME_READINESS_HTTP_FAILED");

  if (!sitemap.ok) blockers.push("PUBLIC_SITEMAP_UNAVAILABLE");
  if (!(robots.ok || robots.status === 404)) warnings.push("ROBOTS_OBSERVATION_UNAVAILABLE");

  const runtimeVerdict = readiness.json?.verdict || null;
  const runtimeBlockers = Array.isArray(readiness.json?.blockers) ? readiness.json.blockers : [];
  if (runtimeVerdict === "BLOCKED_INDEXABILITY") blockers.push(...runtimeBlockers.length ? runtimeBlockers : ["BLOCKED_INDEXABILITY"]);

  const uniqueBlockers = [...new Set(blockers)];
  const uniqueWarnings = [...new Set(warnings)];
  if (uniqueBlockers.length) {
    const deploymentOnly = uniqueBlockers.every((item) => ["REQUIRED_COMMIT_NOT_DEPLOYED", "RUNTIME_READINESS_ROUTE_MISSING"].includes(item));
    return {
      verdict: deploymentOnly ? "RUNTIME_NOT_DEPLOYED" : (runtimeVerdict === "BLOCKED_INDEXABILITY" ? "BLOCKED_INDEXABILITY" : "PRODUCTION_VALIDATION_FAILED"),
      ready: false,
      blockers: uniqueBlockers,
      warnings: uniqueWarnings,
    };
  }

  return {
    verdict: runtimeVerdict === "READY_WAITING_FOR_SEARCH_CONSOLE_DATA" ? "PRODUCTION_READY_WAITING_FOR_SEARCH_CONSOLE_DATA" : "PRODUCTION_READY",
    ready: true,
    blockers: [],
    warnings: uniqueWarnings,
  };
}

async function run({ emitOutput = true } = {}) {
  const headers = parseHeaders();
  const gitState = readGitState();
  const [health, readiness, sitemap, robots] = await Promise.all([
    fetchProbe(`${BACKEND_URL}/search-console-submissions/health`, { headers }),
    fetchProbe(`${BACKEND_URL}/search-console-submissions/runtime-readiness`, { headers }),
    fetchProbe(`${PUBLIC_ORIGIN}/sitemap.xml`, { accept: "application/xml,text/xml,*/*;q=0.1" }),
    fetchProbe(`${PUBLIC_ORIGIN}/robots.txt`, { accept: "text/plain,*/*;q=0.1" }),
  ]);

  const classification = classify({ gitState, health, readiness, sitemap, robots });
  const report = {
    version: "mse-25.75",
    ...classification,
    git: gitState,
    backend: {
      baseUrl: BACKEND_URL,
      health: { status: health.status, ok: health.ok, error: health.error, version: health.json?.version || null },
      runtimeReadiness: {
        status: readiness.status,
        ok: readiness.ok,
        error: readiness.error,
        version: readiness.json?.version || null,
        verdict: readiness.json?.verdict || null,
        readyForGoogleDiscovery: readiness.json?.readyForGoogleDiscovery ?? null,
        summary: readiness.json?.summary || null,
        blockers: readiness.json?.blockers || null,
        warnings: readiness.json?.warnings || null,
      },
    },
    publicSurface: {
      origin: PUBLIC_ORIGIN,
      sitemap: { status: sitemap.status, ok: sitemap.ok, error: sitemap.error },
      robots: { status: robots.status, ok: robots.ok || robots.status === 404, error: robots.error },
    },
    invariants: {
      readOnly: true,
      googleWrites: false,
      sitemapSubmission: false,
      automaticRemediation: false,
      pageMutation: false,
      websiteDesignerMutation: false,
    },
    checkedAt: new Date().toISOString(),
  };

  if (emitOutput) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ready) process.exitCode = 1;
  return report;
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`${JSON.stringify({ version: "mse-25.75", verdict: "PROBE_FAILED", ready: false, error: error?.message || String(error) }, null, 2)}\n`);
    process.exitCode = 1;
  });
}

module.exports = { classify, fetchProbe, parseHeaders, readGitState, run };
