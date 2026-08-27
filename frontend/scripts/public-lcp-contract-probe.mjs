#!/usr/bin/env node

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function absoluteUrl(base, value) {
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

function tagAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
  return match?.[1] || null;
}

function imageTags(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function imagePreloads(html, baseUrl) {
  const urls = [];
  for (const match of html.matchAll(/<link\b[^>]*rel=["']preload["'][^>]*>/gi)) {
    const tag = match[0];
    if (!/\bas=["']image["']/i.test(tag)) continue;
    const href = tagAttribute(tag, "href");
    const resolved = href ? absoluteUrl(baseUrl, href) : null;
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls)];
}

function describeCandidates(html, baseUrl) {
  return imageTags(html)
    .map((tag) => ({
      url: absoluteUrl(baseUrl, tagAttribute(tag, "src")),
      highPriority: /fetchpriority=["']high["']/i.test(tag),
      eager: /loading=["']eager["']/i.test(tag),
      width: tagAttribute(tag, "width"),
      height: tagAttribute(tag, "height"),
    }))
    .filter((item) => item.url);
}

const target = arg("url", process.env.PUBLIC_PERFORMANCE_URL);
const json = arg("json", "false") === "true";
const gate = arg("gate", "false") === "true";

if (!target) {
  console.error("Usage: node scripts/public-lcp-contract-probe.mjs --url=https://… [--gate=true] [--json=true]");
  process.exit(2);
}

const response = await fetch(target, {
  redirect: "follow",
  headers: {
    accept: "text/html,application/xhtml+xml",
    "user-agent": "Mondescale-MSE-25.71-LCP-Contract-Probe/1.0",
  },
  signal: AbortSignal.timeout(15000),
});
const html = await response.text();
const candidates = describeCandidates(html, response.url);
const highPriority = candidates.filter((item) => item.highPriority);
const eager = candidates.filter((item) => item.eager);
const hero = highPriority[0] || eager[0] || null;
const preloads = imagePreloads(html, response.url);
const heroPreloaded = Boolean(hero?.url && preloads.includes(hero.url));
const competingCriticalImages = candidates.filter((item) => item.highPriority || item.eager);

const report = {
  target,
  finalUrl: response.url,
  status: response.status,
  hero,
  preloads,
  highPriorityCount: highPriority.length,
  eagerCount: eager.length,
  criticalCandidateCount: competingCriticalImages.length,
  heroPreloaded,
  criticalCandidates: competingCriticalImages,
};

const failures = [];
if (!response.ok) failures.push(`HTTP ${response.status}`);
if (!hero) failures.push("no LCP image candidate found in initial HTML");
if (hero && !hero.highPriority) failures.push("LCP image candidate is not fetchPriority=high");
if (hero && (!hero.width || !hero.height)) failures.push("LCP image candidate has no intrinsic dimensions");
if (hero && !heroPreloaded) failures.push("LCP image candidate is not preloaded");
if (highPriority.length > 1) failures.push(`multiple fetchPriority=high images (${highPriority.length})`);
if (competingCriticalImages.length > 1) failures.push(`multiple eager/high-priority image contenders (${competingCriticalImages.length})`);

report.gate = {
  enabled: gate,
  passed: failures.length === 0,
  failures,
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("=== MSE-25.71 LCP CONTRACT PROBE ===");
  console.log(`URL=${report.finalUrl}`);
  console.log(`HTTP=${report.status}`);
  console.log(`HERO_URL=${report.hero?.url || "none"}`);
  console.log(`HERO_HIGH_PRIORITY=${Boolean(report.hero?.highPriority)}`);
  console.log(`HERO_EAGER=${Boolean(report.hero?.eager)}`);
  console.log(`HERO_DIMENSIONS=${Boolean(report.hero?.width && report.hero?.height)}`);
  console.log(`HERO_PRELOADED=${report.heroPreloaded}`);
  console.log(`IMAGE_PRELOADS=${report.preloads.length}`);
  console.log(`HIGH_PRIORITY_IMAGES=${report.highPriorityCount}`);
  console.log(`EAGER_IMAGES=${report.eagerCount}`);
  console.log(`CRITICAL_IMAGE_CANDIDATES=${report.criticalCandidateCount}`);
  if (gate) {
    console.log(`LCP_CONTRACT_GATE=${report.gate.passed ? "PASS" : "FAIL"}`);
    for (const failure of failures) console.log(`GATE_FAILURE=${failure}`);
  }
}

if (gate && failures.length) process.exitCode = 1;
else if (!response.ok) process.exitCode = 1;
