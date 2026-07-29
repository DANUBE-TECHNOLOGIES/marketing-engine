const { normalizeText, tokenize, jaccard } = require("./similarity");

const INTENTS = [
  { key: "transactional", patterns: ["voyage", "sejour", "week end", "circuit", "hotel", "reservation", "prix", "offre"] },
  { key: "itinerary", patterns: ["itineraire", "en 2 jours", "en 3 jours", "en 4 jours", "programme"] },
  { key: "informational", patterns: ["que faire", "que voir", "visiter", "guide", "conseils", "incontournables"] },
  { key: "seasonal", patterns: ["quand partir", "meteo", "climat", "noel", "ete", "hiver", "printemps", "automne"] },
  { key: "audience", patterns: ["famille", "enfants", "couple", "amoureux", "senior", "solo"] },
  { key: "comparison", patterns: [" ou ", "comparatif", "versus", "vs"] },
  { key: "practical", patterns: ["ou dormir", "ou manger", "transport", "budget", "formalites", "faq"] }
];

function detectIntent(page = {}) {
  const haystack = ` ${normalizeText([page.title, page.h1, page.slug, page.metaDescription].filter(Boolean).join(" "))} `;
  const matches = [];
  for (const intent of INTENTS) {
    const strength = intent.patterns.reduce((sum, pattern) => sum + (haystack.includes(normalizeText(pattern)) ? 1 : 0), 0);
    if (strength > 0) matches.push({ key: intent.key, strength });
  }
  if (!matches.length) return { primary: "informational", matches: [] };
  matches.sort((a, b) => b.strength - a.strength);
  return { primary: matches[0].key, matches };
}

function intentSimilarity(left, right) {
  const a = detectIntent(left);
  const b = detectIntent(right);
  const primary = a.primary === b.primary ? 1 : 0;
  const overlap = jaccard(a.matches.map((item) => item.key), b.matches.map((item) => item.key));
  const keywordOverlap = jaccard(tokenize(`${left.title || ""} ${left.h1 || ""}`), tokenize(`${right.title || ""} ${right.h1 || ""}`));
  return Number(((primary * 0.55) + (overlap * 0.2) + (keywordOverlap * 0.25)).toFixed(4));
}

module.exports = { detectIntent, intentSimilarity };
