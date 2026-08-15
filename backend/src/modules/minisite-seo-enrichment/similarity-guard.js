"use strict";

const STOPWORDS = new Set([
  "avec","dans","des","du","elle","en","et","eux","il","ils","la","le","les","leur","lui","mais","mes","moi","mon","nos","notre","nous","ou","par","pas","pour","que","qui","sa","ses","son","sur","une","vos","votre","vous",
  "agence","agences","voyage","voyages","mondescale","conseil","conseils","equipe",
]);

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blockText(block) {
  if (!block || typeof block !== "object") return "";
  const content = block.content && typeof block.content === "object" ? block.content : {};
  const values = [content.title, content.heading, content.text, content.body, content.description, content.subtitle];
  if (Array.isArray(content.items)) {
    for (const item of content.items) values.push(item?.title, item?.name, item?.label, item?.text, item?.description, item?.question, item?.answer);
  }
  return values.filter(Boolean).join(" ");
}

function visibleText(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(blockText).filter(Boolean).join(" ");
}

function shingles(value, ignored = [], size = 3) {
  const ignoredSet = new Set(ignored.map(normalize).filter(Boolean));
  const words = normalize(value).split(/\s+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !STOPWORDS.has(word))
    .filter((word) => !ignoredSet.has(word));
  const out = new Set();
  if (words.length < size) {
    if (words.length) out.add(words.join(" "));
    return out;
  }
  for (let index = 0; index <= words.length - size; index += 1) out.add(words.slice(index, index + size).join(" "));
  return out;
}

function similarity(left, right, ignored = []) {
  const a = shingles(left, ignored);
  const b = shingles(right, ignored);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function pageKind(page) {
  return String(page?.slug || page?.pageType || "home").toLocaleLowerCase("fr-FR");
}

function networkSimilarityReport(plans, { threshold = 0.78, minimumWords = 80 } = {}) {
  const candidates = [];
  for (const plan of plans || []) {
    for (const page of plan.pages || []) {
      const text = visibleText(page.optimizedBlocks || page.after || []);
      const words = normalize(text).split(/\s+/).filter(Boolean).length;
      if (words < minimumWords) continue;
      candidates.push({
        agencyId: plan.agencyId,
        siteSlug: plan.siteSlug,
        city: plan.city || plan.agencyCity || "",
        slug: page.slug,
        kind: pageKind(page),
        text,
        words,
      });
    }
  }

  const conflicts = [];
  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i];
      const right = candidates[j];
      if (left.siteSlug === right.siteSlug || left.kind !== right.kind) continue;
      const score = similarity(left.text, right.text, [left.city, right.city]);
      if (score < threshold) continue;
      conflicts.push({ score, pageKind: left.kind, left: { agencyId: left.agencyId, siteSlug: left.siteSlug, slug: left.slug }, right: { agencyId: right.agencyId, siteSlug: right.siteSlug, slug: right.slug } });
    }
  }

  conflicts.sort((a, b) => b.score - a.score);
  return {
    threshold,
    minimumWords,
    candidates: candidates.length,
    conflictCount: conflicts.length,
    blocked: conflicts.length > 0,
    conflicts,
  };
}

module.exports = { normalize, visibleText, similarity, networkSimilarityReport };
