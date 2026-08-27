#!/usr/bin/env node

function arg(name, fallback = null) {
  const prefix = `--${name}=`;
  const match = process.argv.find((entry) => entry.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function numberArg(name, fallback) {
  const parsed = Number(arg(name, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
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

function scriptUrls(html, baseUrl) {
  const found = new Set();
  for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = tagAttribute(match[0], "src");
    const resolved = src ? absoluteUrl(baseUrl, src) : null;
    if (resolved) found.add(resolved);
  }
  return [...found];
}

function urlOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

async function inspectScript(url) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: {
        accept: "application/javascript,text/javascript,*/*;q=0.8",
        "accept-encoding": "gzip, br",
        "user-agent": "Mondescale-MSE-25.71-JS-Payload-Probe/1.0",
      },
    });
    const body = await response.arrayBuffer();
    const contentLength = Number(response.headers.get("content-length"));
    return {
      url,
      finalUrl: response.url,
      origin: urlOrigin(response.url || url),
      status: response.status,
      decodedBytes: body.byteLength,
      encodedBytes: Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null,
      contentType: response.headers.get("content-type"),
      contentEncoding: response.headers.get("content-encoding"),
      cacheControl: response.headers.get("cache-control"),
    };
  } catch (error) {
    return { url, origin: urlOrigin(url), error: error.message };
  }
}

const target = arg("url", process.env.PUBLIC_PERFORMANCE_URL);
const gate = arg("gate", "false") === "true";
const json = arg("json", "false") === "true";
const maxScripts = Math.max(1, Math.min(40, numberArg("max-scripts", 20)));
const maxDecodedJsBytes = Math.max(100_000, numberArg("max-decoded-js-bytes", 900_000));
const maxScriptCount = Math.max(1, numberArg("max-script-count", 20));

if (!target) {
  console.error(
    "Usage: node scripts/public-js-payload-probe.mjs --url=https://… [--gate=true] [--max-decoded-js-bytes=900000] [--max-script-count=20]"
  );
  process.exit(2);
}

const pageResponse = await fetch(target, {
  redirect: "follow",
  signal: AbortSignal.timeout(15000),
  headers: {
    accept: "text/html,application/xhtml+xml",
    "user-agent": "Mondescale-MSE-25.71-JS-Payload-Probe/1.0",
  },
});
const html = await pageResponse.text();
const urls = scriptUrls(html, pageResponse.url).slice(0, maxScripts);
const scripts = await Promise.all(urls.map(inspectScript));
const successful = scripts.filter((item) => item.status >= 200 && item.status < 400);
const decodedBytes = successful.reduce((sum, item) => sum + (item.decodedBytes || 0), 0);
const encodedBytesKnown = successful.reduce((sum, item) => sum + (item.encodedBytes || 0), 0);
const encodedBytesCoverage = successful.filter((item) => item.encodedBytes).length;
const largest = [...successful]
  .sort((a, b) => (b.decodedBytes || 0) - (a.decodedBytes || 0))
  .slice(0, 5);
const origins = [...new Set(successful.map((item) => item.origin).filter(Boolean))];
const thirdParty = successful.filter((item) => item.origin && item.origin !== urlOrigin(pageResponse.url));
const failures = [];

if (!pageResponse.ok) failures.push(`HTTP ${pageResponse.status}`);
if (urls.length > maxScriptCount) failures.push(`script count ${urls.length} > ${maxScriptCount}`);
if (decodedBytes > maxDecodedJsBytes) failures.push(`decoded JS payload ${decodedBytes}B > ${maxDecodedJsBytes}B`);
for (const item of scripts) {
  if (item.status >= 400) failures.push(`script HTTP ${item.status}: ${item.url}`);
}

const report = {
  target,
  finalUrl: pageResponse.url,
  status: pageResponse.status,
  scripts: {
    discovered: scriptUrls(html, pageResponse.url).length,
    inspected: scripts.length,
    successful: successful.length,
    decodedBytes,
    encodedBytesKnown,
    encodedBytesCoverage,
    origins,
    thirdPartyCount: thirdParty.length,
    largest,
  },
  gate: {
    enabled: gate,
    maxDecodedJsBytes,
    maxScriptCount,
    passed: failures.length === 0,
    failures,
  },
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("=== MSE-25.71 PUBLIC JS PAYLOAD PROBE ===");
  console.log(`URL=${report.finalUrl}`);
  console.log(`HTTP=${report.status}`);
  console.log(`SCRIPTS_DISCOVERED=${report.scripts.discovered}`);
  console.log(`SCRIPTS_INSPECTED=${report.scripts.inspected}`);
  console.log(`JS_DECODED_BYTES=${report.scripts.decodedBytes}`);
  console.log(`JS_ENCODED_BYTES_KNOWN=${report.scripts.encodedBytesKnown}`);
  console.log(`JS_ENCODED_BYTES_COVERAGE=${report.scripts.encodedBytesCoverage}/${report.scripts.successful}`);
  console.log(`JS_ORIGINS=${report.scripts.origins.join(",") || "none"}`);
  console.log(`THIRD_PARTY_SCRIPT_COUNT=${report.scripts.thirdPartyCount}`);
  for (const [index, item] of report.scripts.largest.entries()) {
    console.log(
      `SCRIPT_${index + 1}_DECODED_BYTES=${item.decodedBytes || 0} ENCODED_BYTES=${item.encodedBytes || 0} ENCODING=${item.contentEncoding || "none"} CACHE=${item.cacheControl || "none"} URL=${item.url}`
    );
  }
  if (gate) {
    console.log(`JS_PAYLOAD_GATE=${report.gate.passed ? "PASS" : "FAIL"}`);
    for (const failure of failures) console.log(`JS_GATE_FAILURE=${failure}`);
  }
}

if (gate && failures.length) process.exitCode = 1;
else if (!pageResponse.ok) process.exitCode = 1;
