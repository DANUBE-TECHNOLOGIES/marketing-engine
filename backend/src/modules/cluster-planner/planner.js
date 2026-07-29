const { buildIntentCandidates } = require('./intent-engine');
const { buildTopology } = require('./topology-builder');
const { normalizeText, similarity } = require('./normalizer');

function pageHaystack(page) {
  return [page.title, page.slug, page.path, page.seoTitle, page.h1].filter(Boolean).join(' ');
}

function matchExisting(candidate, pages) {
  let best = null;
  for (const page of pages) {
    const score = similarity(`${candidate.title} ${candidate.slug}`, pageHaystack(page));
    const exactSlug = normalizeText(page.slug) === normalizeText(candidate.slug);
    const exactTitle = normalizeText(page.title) === normalizeText(candidate.title);
    const effectiveScore = exactSlug || exactTitle ? 1 : score;
    if (!best || effectiveScore > best.score) best = { page, score: effectiveScore };
  }
  return best && best.score >= 0.46 ? best : null;
}

function detectCannibalization(candidates, existingPages) {
  const warnings = [];
  for (let i = 0; i < existingPages.length; i += 1) {
    for (let j = i + 1; j < existingPages.length; j += 1) {
      const score = similarity(pageHaystack(existingPages[i]), pageHaystack(existingPages[j]));
      if (score >= 0.7) {
        warnings.push({
          type: 'existing-pages',
          severity: score >= 0.85 ? 'high' : 'medium',
          score: Math.round(score * 100),
          pages: [pickPage(existingPages[i]), pickPage(existingPages[j])],
          message: 'Deux pages existantes semblent couvrir une intention très proche.'
        });
      }
    }
  }
  for (const candidate of candidates) {
    const close = existingPages
      .map((page) => ({ page, score: similarity(candidate.title, pageHaystack(page)) }))
      .filter((entry) => entry.score >= 0.62)
      .sort((a, b) => b.score - a.score);
    if (close.length > 1) {
      warnings.push({
        type: 'candidate-overlap',
        severity: 'medium',
        candidate: candidate.key,
        score: Math.round(close[0].score * 100),
        pages: close.slice(0, 3).map((entry) => pickPage(entry.page)),
        message: `La page envisagée « ${candidate.title} » pourrait concurrencer plusieurs pages existantes.`
      });
    }
  }
  return warnings;
}

function pickPage(page) {
  return { id: page.id, title: page.title, slug: page.slug, path: page.path, status: page.status };
}

function planCluster({ destination, existingPages = [], limit = 20 }) {
  const candidates = buildIntentCandidates(destination).slice(0, Math.max(1, limit));
  const plannedPages = candidates.map((candidate) => {
    const match = matchExisting(candidate, existingPages);
    return {
      ...candidate,
      state: match ? 'existing' : 'missing',
      existingPage: match ? pickPage(match.page) : null,
      matchScore: match ? Math.round(match.score * 100) : 0
    };
  });
  const existing = plannedPages.filter((page) => page.state === 'existing');
  const missing = plannedPages.filter((page) => page.state === 'missing');
  const coverage = plannedPages.length ? Math.round((existing.length / plannedPages.length) * 100) : 0;
  return {
    destination: {
      id: destination.id,
      name: destination.name,
      slug: destination.slug,
      country: destination.country,
      region: destination.region || null
    },
    summary: {
      totalPlanned: plannedPages.length,
      existing: existing.length,
      missing: missing.length,
      coverage
    },
    pillar: plannedPages.find((page) => page.key === 'pillar') || null,
    pages: plannedPages.sort((a, b) => b.priority - a.priority),
    existingPages: existing,
    missingPages: missing,
    priorities: missing.sort((a, b) => b.priority - a.priority).map((page, index) => ({ rank: index + 1, ...page })),
    topology: buildTopology(plannedPages),
    cannibalization: detectCannibalization(candidates, existingPages)
  };
}

module.exports = { planCluster, matchExisting, detectCannibalization };
