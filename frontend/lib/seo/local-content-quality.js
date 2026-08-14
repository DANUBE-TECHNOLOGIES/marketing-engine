import { resolvedTargetCities } from "./local-area-config";

const THIN_PAGE_MIN_WORDS = 140;
const STRONG_PAGE_MIN_WORDS = 260;
const STRONG_PAGE_MIN_LOCAL_SIGNALS = 1;

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return clean(String(value || "").replace(/<[^>]*>/g, " "));
}

function collectText(value, output = []) {
  if (value == null) return output;
  if (typeof value === "string") {
    const text = stripHtml(value);
    if (text) output.push(text);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output));
    return output;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (/^(id|imageAssetId|imageUrl|url|href|slug|status|type|blockType)$/i.test(key)) continue;
      collectText(child, output);
    }
  }
  return output;
}

function wordCount(value) {
  const text = clean(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function pageText(page) {
  const sections = Array.isArray(page?.sections)
    ? page.sections
    : Array.isArray(page?.blocks)
      ? page.blocks
      : [];
  return collectText(sections).join(" ");
}

function localSignals(site) {
  const agency = site?.agency || {};
  return [
    clean(agency.city || site?.city),
    ...resolvedTargetCities(site, { limit: 6 }),
  ].filter(Boolean);
}

function localMentions(text, site) {
  const haystack = clean(text).toLocaleLowerCase("fr-FR");
  return localSignals(site).filter((city) =>
    haystack.includes(city.toLocaleLowerCase("fr-FR"))
  );
}

export function assessLocalContentQuality({ site, page }) {
  const text = pageText(page);
  const words = wordCount(text);
  const mentions = localMentions(text, site);
  const primaryCity = clean(site?.agency?.city || site?.city);
  const hasPrimaryCity = Boolean(
    primaryCity && mentions.some((city) => city.toLocaleLowerCase("fr-FR") === primaryCity.toLocaleLowerCase("fr-FR"))
  );
  const localSignalCount = mentions.length;
  const thin = words < THIN_PAGE_MIN_WORDS;
  const hasEditorialDepth = words >= STRONG_PAGE_MIN_WORDS;
  const hasLocalDepth = hasPrimaryCity && localSignalCount >= STRONG_PAGE_MIN_LOCAL_SIGNALS;
  const strong = hasEditorialDepth && hasLocalDepth;

  return {
    words,
    thin,
    strong,
    hasEditorialDepth,
    hasLocalDepth,
    hasPrimaryCity,
    localSignalCount,
    localMentions: mentions,
    needsLocalContext: !hasLocalDepth,
    needsEditorialDepth: thin,
  };
}

export {
  STRONG_PAGE_MIN_LOCAL_SIGNALS,
  STRONG_PAGE_MIN_WORDS,
  THIN_PAGE_MIN_WORDS,
  collectText,
  localMentions,
  localSignals,
  pageText,
  wordCount,
};
