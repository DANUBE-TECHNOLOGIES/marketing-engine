"use strict";

const STOPWORDS = new Set(
  "a au aux avec ce ces dans de des du elle en et eux il je la le les leur lui ma mais me meme mes moi mon ne nos notre nous on ou par pas pour qu que qui sa se ses son sur ta te tes toi ton tu un une vos votre vous c est sont plus agence agences voyage voyages mondescale fram".split(" ")
);

const PRESENTATION_KEYS = new Set([
  "align",
  "alignment",
  "background",
  "backgroundcolor",
  "backgroundimage",
  "borderradius",
  "class",
  "classname",
  "color",
  "columns",
  "ctavariant",
  "display",
  "height",
  "href",
  "icon",
  "id",
  "image",
  "imageurl",
  "key",
  "layout",
  "mode",
  "objectfit",
  "position",
  "primary",
  "secondary",
  "size",
  "slug",
  "style",
  "target",
  "theme",
  "tone",
  "type",
  "url",
  "variant",
  "width"
]);

const PRESENTATION_VALUES = new Set([
  "left",
  "right",
  "center",
  "centre",
  "top",
  "bottom",
  "primary",
  "secondary",
  "outline",
  "ghost",
  "light",
  "dark",
  "desktop",
  "mobile",
  "tablet",
  "contain",
  "cover",
  "auto",
  "none",
  "true",
  "false"
]);

function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePresentationValue(value) {
  const normalized = clean(value);
  if (!normalized) return true;
  if (PRESENTATION_VALUES.has(normalized)) return true;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(String(value || "").trim())) return true;
  if (/^#[0-9a-f]{3,8}$/i.test(String(value || "").trim())) return true;
  return false;
}

function collectEditorialText(value, chunks = [], key = "") {
  if (value == null) return chunks;

  const normalizedKey = clean(key).replace(/\s+/g, "");
  if (normalizedKey && PRESENTATION_KEYS.has(normalizedKey)) return chunks;

  if (typeof value === "string") {
    if (!looksLikePresentationValue(value)) chunks.push(value);
    return chunks;
  }

  if (typeof value === "number" || typeof value === "boolean") return chunks;

  if (Array.isArray(value)) {
    for (const item of value) collectEditorialText(item, chunks, key);
    return chunks;
  }

  if (typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectEditorialText(childValue, chunks, childKey);
    }
  }

  return chunks;
}

// Kept as a compatibility alias for callers/tests introduced in MSE-25.12.
function collectObjectText(value, chunks = []) {
  return collectEditorialText(value, chunks);
}

function blockText(block) {
  const chunks = [];
  collectEditorialText(block?.content || {}, chunks);
  return clean(chunks.filter(Boolean).join(" "));
}

function sectionText(section) {
  const chunks = [];
  collectEditorialText(section?.jsonContent || {}, chunks);
  return clean(chunks.filter(Boolean).join(" "));
}

function pageFragments(page) {
  const fragments = [];

  const metaText = clean(
    [page?.title, page?.h1, page?.seoTitle, page?.metaDescription]
      .filter(Boolean)
      .join(" ")
  );

  if (metaText) {
    fragments.push({
      source: "meta",
      id: null,
      type: "page-meta",
      name: "Métadonnées de page",
      displayOrder: -1,
      text: metaText
    });
  }

  for (const [index, section] of (page?.sections || []).entries()) {
    const text = sectionText(section);
    if (!text) continue;
    fragments.push({
      source: "section",
      id: section?.id || null,
      type: section?.sectionType || "section",
      name: section?.sectionType || `Section ${index + 1}`,
      displayOrder: Number.isFinite(section?.displayOrder) ? section.displayOrder : index,
      text
    });
  }

  for (const [index, block] of (page?.blocks || []).entries()) {
    const text = blockText(block);
    if (!text) continue;
    fragments.push({
      source: "block",
      id: block?.id || null,
      type: block?.blockType || "block",
      name: block?.name || block?.blockType || `Bloc ${index + 1}`,
      displayOrder: Number.isFinite(block?.displayOrder) ? block.displayOrder : index,
      text
    });
  }

  return fragments;
}

function pageText(page) {
  return clean(pageFragments(page).map((fragment) => fragment.text).join(" "));
}

function shingles(text, size = 5) {
  const words = clean(text).split(" ").filter(Boolean);
  const output = new Set();
  for (let index = 0; index <= words.length - size; index += 1) {
    output.add(words.slice(index, index + size).join(" "));
  }
  return output;
}

function similarity(a, b) {
  const A = shingles(a);
  const B = shingles(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const item of A) if (B.has(item)) intersection += 1;
  return intersection / Math.min(A.size, B.size);
}

function sharedSegments(a, b, size = 8, limit = 8) {
  const words = clean(a).split(" ").filter(Boolean);
  const other = shingles(b, size);
  const segments = [];

  for (let index = 0; index <= words.length - size; index += 1) {
    const phrase = words.slice(index, index + size).join(" ");
    if (
      other.has(phrase) &&
      !segments.some((segment) => segment.includes(phrase) || phrase.includes(segment))
    ) {
      segments.push(phrase);
    }
    if (segments.length >= limit) break;
  }

  return segments;
}

function distinctiveTerms(text, limit = 12) {
  const counts = new Map();
  for (const word of clean(text).split(" ")) {
    if (word.length < 4 || STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function recommendations(target, matches, segments) {
  const agency = target?.site?.agency || {};
  const city = String(agency.city || "").trim();
  const name = String(agency.name || target?.site?.name || "").trim();
  const ideas = [];

  if (segments.length) {
    ideas.push({
      priority: "high",
      code: "REWRITE_SHARED_SEGMENTS",
      title: "Réécrire les passages communs au réseau",
      detail: `${segments.length} segment(s) de formulation sont partagés avec les pages les plus proches. Conserver le fond métier, mais reformuler avec des preuves propres à ${name || "cette agence"}.`
    });
  }

  ideas.push({
    priority: "high",
    code: "ADD_LOCAL_PROOFS",
    title: "Ajouter des preuves locales vérifiables",
    detail: `Renforcer la page avec des éléments réellement propres à l'agence${city ? ` de ${city}` : ""} : équipe, adresse et accès, zones de clientèle, spécialités attestées, avis locaux, partenariats et habitudes de départ.`
  });

  ideas.push({
    priority: "medium",
    code: "LOCAL_INTENT_COPY",
    title: "Renforcer l'intention de recherche locale",
    detail: `Développer des formulations naturelles liées à ${city || "la ville"} et aux besoins des voyageurs locaux, sans répéter artificiellement le nom de la commune.`
  });

  if (matches.length) {
    ideas.push({
      priority: "medium",
      code: "DIFFERENTIATE_FROM_NEAREST",
      title: "Se différencier des agences les plus proches éditorialement",
      detail: `Priorité de différenciation face à ${matches.slice(0, 3).map((match) => match.agencyName).join(", ")}.`
    });
  }

  return ideas;
}

function blockRecommendation(fragment, nearest, segments, target) {
  const city = String(target?.site?.agency?.city || "").trim();
  if (segments.length) {
    return {
      priority: nearest >= 0.7 ? "high" : "medium",
      code: "DIFFERENTIATE_BLOCK_COPY",
      title: `Différencier le bloc « ${fragment.name} »`,
      detail: `Ce bloc partage ${segments.length} formulation(s) avec d'autres mini-sites. Remplacer les formulations génériques par des faits vérifiables${city ? ` propres à ${city}` : " propres à l'agence"}.`
    };
  }
  return null;
}

function analyzeBlockInsights(target, candidates) {
  const targetBlocks = pageFragments(target).filter(
    (fragment) => fragment.source === "block" && fragment.text.split(" ").filter(Boolean).length >= 12
  );

  const candidateFragments = candidates
    .filter((page) => page.id !== target.id)
    .flatMap((page) =>
      pageFragments(page)
        .filter((fragment) => fragment.source === "block")
        .map((fragment) => ({ page, fragment }))
    );

  return targetBlocks
    .map((fragment) => {
      const nearestMatches = candidateFragments
        .map(({ page, fragment: other }) => ({
          pageId: page.id,
          agencyName: page?.site?.agency?.name || page?.site?.name || "Autre agence",
          slug: page.slug,
          blockId: other.id,
          blockType: other.type,
          similarity: Number(similarity(fragment.text, other.text).toFixed(3)),
          sharedSegments: sharedSegments(fragment.text, other.text, 8, 4)
        }))
        .filter((match) => match.similarity >= 0.2 || match.sharedSegments.length)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 3);

      const highestSimilarity = nearestMatches[0]?.similarity || 0;
      const segments = nearestMatches
        .flatMap((match) => match.sharedSegments)
        .filter((value, index, values) => values.indexOf(value) === index)
        .slice(0, 6);
      const advice = blockRecommendation(fragment, highestSimilarity, segments, target);

      return {
        blockId: fragment.id,
        blockType: fragment.type,
        blockName: fragment.name,
        displayOrder: fragment.displayOrder,
        wordCount: fragment.text.split(" ").filter(Boolean).length,
        score: Math.max(0, Math.round((1 - highestSimilarity) * 100)),
        highestSimilarity,
        sharedSegments: segments,
        nearestMatches,
        recommendations: advice ? [advice] : []
      };
    })
    .filter((insight) => insight.highestSimilarity >= 0.2 || insight.sharedSegments.length)
    .sort((a, b) => b.highestSimilarity - a.highestSimilarity);
}

function analyzeUniqueness(target, candidates = []) {
  const text = pageText(target);
  const rawMatches = candidates
    .filter((page) => page.id !== target.id)
    .map((page) => ({
      page,
      similarity: Number(similarity(text, pageText(page)).toFixed(3))
    }))
    .filter((match) => match.similarity >= 0.2)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  const matches = rawMatches.map(({ page, similarity: pageSimilarity }) => ({
    pageId: page.id,
    siteId: page.siteId,
    agencyId: page.site?.agencyId,
    agencyName: page.site?.agency?.name || page.site?.name || "Autre agence",
    slug: page.slug,
    similarity: pageSimilarity
  }));

  const highest = matches[0]?.similarity || 0;
  const segments = rawMatches
    .flatMap((match) => sharedSegments(text, pageText(match.page), 8, 4))
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 10);
  const blockInsights = analyzeBlockInsights(target, candidates);

  return {
    version: "1.3",
    score: Math.max(0, Math.round((1 - highest) * 100)),
    ready: highest < 0.55,
    severity: highest >= 0.7 ? "blocker" : highest >= 0.55 ? "warning" : "ok",
    highestSimilarity: highest,
    matches,
    sharedSegments: segments,
    distinctiveTerms: distinctiveTerms(text),
    recommendations: recommendations(target, matches, segments),
    blockInsights,
    metrics: {
      targetWordCount: text ? text.split(" ").filter(Boolean).length : 0,
      candidatesObserved: candidates.length,
      sharedSegmentCount: segments.length,
      blocksObserved: pageFragments(target).filter((fragment) => fragment.source === "block").length,
      blocksFlagged: blockInsights.length
    },
    note:
      highest >= 0.7
        ? "Contenu trop proche d'une autre page du réseau : différenciation locale indispensable."
        : highest >= 0.55
          ? "Similarité réseau élevée : renforcer les preuves et formulations propres à l'agence."
          : highest >= 0.4
            ? "Page publiable, mais encore fortement issue du socle éditorial réseau : différenciation locale recommandée."
            : "Aucune similarité réseau préoccupante détectée."
  };
}

module.exports = {
  clean,
  collectEditorialText,
  collectObjectText,
  blockText,
  sectionText,
  pageFragments,
  pageText,
  shingles,
  similarity,
  sharedSegments,
  distinctiveTerms,
  analyzeBlockInsights,
  analyzeUniqueness
};
