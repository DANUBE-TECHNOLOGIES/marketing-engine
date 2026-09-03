const FRENCH_STOPWORDS = new Set([
  "a","au","aux","avec","ce","ces","dans","de","des","du","elle","en","et","eux","il","ils","je","la","le","les","leur","lui","ma","mais","me","meme","mes","moi","mon","ne","nos","notre","nous","on","ou","par","pas","pour","qu","que","qui","sa","se","ses","son","sur","ta","te","tes","toi","ton","tu","un","une","vos","votre","vous","y",
  "agence","agences","voyage","voyages","mondescale","conseil","conseils","equipe","votre","notre",
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

function tokens(value, ignored = []) {
  const ignoredSet = new Set(ignored.map(normalize).filter(Boolean));
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3)
    .filter((token) => !FRENCH_STOPWORDS.has(token))
    .filter((token) => !ignoredSet.has(token));
}

function shingles(value, { size = 3, ignored = [] } = {}) {
  const words = tokens(value, ignored);
  const result = new Set();
  if (words.length < size) {
    if (words.length) result.add(words.join(" "));
    return result;
  }
  for (let index = 0; index <= words.length - size; index += 1) {
    result.add(words.slice(index, index + size).join(" "));
  }
  return result;
}

function jaccard(left, right) {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  return intersection / (left.size + right.size - intersection);
}

export function semanticSimilarity(left, right, options = {}) {
  return jaccard(shingles(left, options), shingles(right, options));
}

export function similarCrossSitePages(rows, {
  threshold = 0.78,
  minimumWords = 120,
} = {}) {
  const candidates = rows.filter((row) => row.wordCount >= minimumWords && row.visibleText);
  const matches = [];

  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    const left = candidates[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const right = candidates[rightIndex];
      if (left.siteSlug === right.siteSlug) continue;
      if (left.pageKind !== right.pageKind) continue;

      const ignored = [left.city, right.city].filter(Boolean);
      const score = semanticSimilarity(left.visibleText, right.visibleText, { ignored });
      if (score < threshold) continue;

      matches.push({
        score,
        pageKind: left.pageKind,
        left: left.url,
        right: right.url,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export {
  FRENCH_STOPWORDS,
  jaccard,
  normalize,
  shingles,
  tokens,
};
