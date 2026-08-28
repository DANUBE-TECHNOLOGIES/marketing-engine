"use strict";

const PUBLIC_INDEXABILITY_REASONS = Object.freeze({
  OK: "PUBLIC_INDEXABILITY_OK",
  FETCH_UNAVAILABLE: "PUBLIC_FETCH_UNAVAILABLE",
  HTTP_ERROR: "PUBLIC_HTTP_ERROR",
  REDIRECTED: "PUBLIC_URL_REDIRECTED",
  ROBOTS_TXT_BLOCKED: "PUBLIC_ROBOTS_TXT_BLOCKED",
  META_NOINDEX: "PUBLIC_META_NOINDEX",
  X_ROBOTS_NOINDEX: "PUBLIC_X_ROBOTS_NOINDEX",
  CANONICAL_MISMATCH: "PUBLIC_CANONICAL_MISMATCH",
});

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    const path = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/g, "");
    return `${url.protocol}//${url.host}${path}`;
  } catch (_error) {
    return null;
  }
}

function sameOrigin(url, origin) {
  try { return new URL(url).origin === new URL(origin).origin; }
  catch (_error) { return false; }
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const key = Object.keys(headers).find((item) => item.toLowerCase() === String(name).toLowerCase());
  return key ? headers[key] : null;
}

function hasNoindex(value) {
  return /(^|[,\s])noindex([,\s]|$)/i.test(String(value || ""));
}

function metaRobotsFromHtml(html) {
  const source = String(html || "");
  const tags = source.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/\bname\s*=\s*["']?([^"'\s>]+)/i)?.[1];
    if (!name || !["robots", "googlebot"].includes(String(name).toLowerCase())) continue;
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]
      || tag.match(/\bcontent\s*=\s*([^\s>]+)/i)?.[1]
      || "";
    if (hasNoindex(content)) return "noindex";
  }
  return null;
}

function canonicalFromHtml(html, baseUrl) {
  const source = String(html || "");
  const links = source.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    const rel = tag.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1]
      || tag.match(/\brel\s*=\s*([^\s>]+)/i)?.[1]
      || "";
    if (!String(rel).split(/\s+/).some((item) => item.toLowerCase() === "canonical")) continue;
    const href = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
      || tag.match(/\bhref\s*=\s*([^\s>]+)/i)?.[1];
    if (!href) return null;
    try { return normalizeUrl(new URL(href, baseUrl).toString()); }
    catch (_error) { return normalizeUrl(href); }
  }
  return null;
}

function parseRobotsTxt(text) {
  const groups = [];
  let agents = [];
  let rules = [];
  const flush = () => {
    if (agents.length) groups.push({ agents: [...agents], rules: [...rules] });
    agents = [];
    rules = [];
  };

  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/g, "").trim();
    if (!line) continue;
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (!match) continue;
    const field = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (field === "user-agent") {
      if (rules.length) flush();
      agents.push(value.toLowerCase());
    } else if ((field === "allow" || field === "disallow") && agents.length) {
      rules.push({ type: field, path: value });
    }
  }
  flush();
  return groups;
}

function robotsDecision(robotsText, targetUrl, userAgent = "googlebot") {
  let pathname = "/";
  try { pathname = new URL(targetUrl).pathname || "/"; } catch (_error) {}
  const groups = parseRobotsTxt(robotsText);
  const relevant = groups.filter((group) => group.agents.some((agent) => agent === "*" || userAgent.toLowerCase().includes(agent)));
  const rules = relevant.flatMap((group) => group.rules).filter((rule) => rule.path !== "");
  const matches = rules.filter((rule) => pathname.startsWith(rule.path)).sort((a, b) => b.path.length - a.path.length);
  if (!matches.length) return { allowed: true, matchedRule: null };
  const winner = matches[0];
  return { allowed: winner.type === "allow", matchedRule: `${winner.type}:${winner.path}` };
}

async function fetchWithTimeout(fetchImpl, url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetchImpl(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function publicReason(observation) {
  if (observation.fetchError) return PUBLIC_INDEXABILITY_REASONS.FETCH_UNAVAILABLE;
  if (!observation.httpOk) return PUBLIC_INDEXABILITY_REASONS.HTTP_ERROR;
  if (observation.robotsTxtAllowed === false) return PUBLIC_INDEXABILITY_REASONS.ROBOTS_TXT_BLOCKED;
  if (observation.xRobotsNoindex) return PUBLIC_INDEXABILITY_REASONS.X_ROBOTS_NOINDEX;
  if (observation.metaRobotsNoindex) return PUBLIC_INDEXABILITY_REASONS.META_NOINDEX;
  if (observation.canonicalMatchesExpected === false) return PUBLIC_INDEXABILITY_REASONS.CANONICAL_MISMATCH;
  if (observation.redirected) return PUBLIC_INDEXABILITY_REASONS.REDIRECTED;
  return PUBLIC_INDEXABILITY_REASONS.OK;
}

class PublicIndexabilityObserver {
  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 5000, concurrency = 6, maxHtmlBytes = 512000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.concurrency = Math.max(1, Math.min(12, Number(concurrency || 6)));
    this.maxHtmlBytes = Math.max(16384, Number(maxHtmlBytes || 512000));
  }

  async readRobots(publicOrigin) {
    const robotsUrl = `${String(publicOrigin || "").replace(/\/+$/g, "")}/robots.txt`;
    try {
      const response = await fetchWithTimeout(this.fetchImpl, robotsUrl, { method: "GET", redirect: "follow", headers: { Accept: "text/plain,*/*;q=0.1", "User-Agent": "Mondescale-Indexability-Observer/1.0" } }, this.timeoutMs);
      const text = response.ok ? (await response.text()).slice(0, this.maxHtmlBytes) : "";
      return { url: robotsUrl, status: response.status, ok: response.ok, text, error: null };
    } catch (error) {
      return { url: robotsUrl, status: null, ok: false, text: "", error: error?.name === "AbortError" ? "timeout" : error?.message || String(error) };
    }
  }

  async observeUrl(expectedUrl, publicOrigin, robots) {
    const normalizedExpected = normalizeUrl(expectedUrl);
    if (!normalizedExpected || !sameOrigin(normalizedExpected, publicOrigin)) {
      return { expectedUrl: normalizedExpected || expectedUrl || null, fetchError: "out-of-public-origin", reason: PUBLIC_INDEXABILITY_REASONS.FETCH_UNAVAILABLE };
    }

    const robotsResult = robots?.ok ? robotsDecision(robots.text, normalizedExpected) : { allowed: null, matchedRule: null };
    try {
      const response = await fetchWithTimeout(this.fetchImpl, normalizedExpected, { method: "GET", redirect: "follow", headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Mondescale-Indexability-Observer/1.0" } }, this.timeoutMs);
      const contentType = String(headerValue(response.headers, "content-type") || "").toLowerCase();
      let html = "";
      if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") || !contentType) {
        html = (await response.text()).slice(0, this.maxHtmlBytes);
      }
      const finalUrl = normalizeUrl(response.url || normalizedExpected) || normalizedExpected;
      const canonical = canonicalFromHtml(html, finalUrl);
      const xRobots = headerValue(response.headers, "x-robots-tag");
      const metaRobots = metaRobotsFromHtml(html);
      const observation = {
        expectedUrl: normalizedExpected,
        status: Number(response.status || 0),
        httpOk: response.ok === true,
        finalUrl,
        redirected: finalUrl !== normalizedExpected,
        contentType: contentType || null,
        xRobotsTag: xRobots || null,
        xRobotsNoindex: hasNoindex(xRobots),
        metaRobotsDirective: metaRobots,
        metaRobotsNoindex: metaRobots === "noindex",
        publicCanonical: canonical,
        canonicalMatchesExpected: canonical ? canonical === normalizedExpected : null,
        robotsTxtAllowed: robotsResult.allowed,
        robotsTxtRule: robotsResult.matchedRule,
        fetchError: null,
      };
      return { ...observation, reason: publicReason(observation) };
    } catch (error) {
      const observation = {
        expectedUrl: normalizedExpected,
        status: null,
        httpOk: false,
        finalUrl: null,
        redirected: false,
        contentType: null,
        xRobotsTag: null,
        xRobotsNoindex: false,
        metaRobotsDirective: null,
        metaRobotsNoindex: false,
        publicCanonical: null,
        canonicalMatchesExpected: null,
        robotsTxtAllowed: robotsResult.allowed,
        robotsTxtRule: robotsResult.matchedRule,
        fetchError: error?.name === "AbortError" ? "timeout" : error?.message || String(error),
      };
      return { ...observation, reason: publicReason(observation) };
    }
  }

  async audit({ urls, publicOrigin } = {}) {
    const uniqueUrls = [...new Set((urls || []).map(normalizeUrl).filter((url) => url && sameOrigin(url, publicOrigin)))];
    const robots = await this.readRobots(publicOrigin);
    const observations = new Array(uniqueUrls.length);
    let cursor = 0;
    const worker = async () => {
      while (cursor < uniqueUrls.length) {
        const index = cursor++;
        observations[index] = await this.observeUrl(uniqueUrls[index], publicOrigin, robots);
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, uniqueUrls.length || 1) }, worker));
    const issueReasons = new Set([
      PUBLIC_INDEXABILITY_REASONS.HTTP_ERROR,
      PUBLIC_INDEXABILITY_REASONS.ROBOTS_TXT_BLOCKED,
      PUBLIC_INDEXABILITY_REASONS.META_NOINDEX,
      PUBLIC_INDEXABILITY_REASONS.X_ROBOTS_NOINDEX,
      PUBLIC_INDEXABILITY_REASONS.CANONICAL_MISMATCH,
    ]);
    return {
      version: "mse-25.70",
      publicOrigin,
      robots: { url: robots.url, status: robots.status, ok: robots.ok, error: robots.error },
      summary: {
        observedUrlCount: observations.length,
        reachableCount: observations.filter((item) => item.httpOk).length,
        fetchUnavailableCount: observations.filter((item) => item.reason === PUBLIC_INDEXABILITY_REASONS.FETCH_UNAVAILABLE).length,
        redirectedCount: observations.filter((item) => item.redirected).length,
        robotsBlockedCount: observations.filter((item) => item.reason === PUBLIC_INDEXABILITY_REASONS.ROBOTS_TXT_BLOCKED).length,
        noindexCount: observations.filter((item) => [PUBLIC_INDEXABILITY_REASONS.META_NOINDEX, PUBLIC_INDEXABILITY_REASONS.X_ROBOTS_NOINDEX].includes(item.reason)).length,
        canonicalMismatchCount: observations.filter((item) => item.reason === PUBLIC_INDEXABILITY_REASONS.CANONICAL_MISMATCH).length,
        httpErrorCount: observations.filter((item) => item.reason === PUBLIC_INDEXABILITY_REASONS.HTTP_ERROR).length,
        publicIssueCount: observations.filter((item) => issueReasons.has(item.reason)).length,
      },
      observations,
      readOnly: true,
      writes: false,
      observedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  PUBLIC_INDEXABILITY_REASONS,
  PublicIndexabilityObserver,
  canonicalFromHtml,
  hasNoindex,
  metaRobotsFromHtml,
  normalizeUrl,
  parseRobotsTxt,
  publicReason,
  robotsDecision,
  sameOrigin,
};
