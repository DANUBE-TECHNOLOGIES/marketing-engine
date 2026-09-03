function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOP_WORDS = new Set([
  "a", "au", "aux", "avec", "ce", "ces", "dans", "de", "des", "du", "elle", "en", "et", "eux",
  "il", "je", "la", "le", "les", "leur", "lui", "ma", "mais", "me", "meme", "mes", "moi", "mon",
  "ne", "nos", "notre", "nous", "on", "ou", "par", "pas", "pour", "qu", "que", "qui", "sa", "se",
  "ses", "son", "sur", "ta", "te", "tes", "toi", "ton", "tu", "un", "une", "vos", "votre", "vous",
  "the", "and", "of", "to", "in"
]);

function tokenize(value = "") {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function jaccard(left, right) {
  const a = new Set(Array.isArray(left) ? left : tokenize(left));
  const b = new Set(Array.isArray(right) ? right : tokenize(right));
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function diceBigrams(value = "") {
  const text = normalizeText(value).replace(/\s/g, "");
  if (text.length < 2) return text ? [text] : [];
  const result = [];
  for (let i = 0; i < text.length - 1; i += 1) result.push(text.slice(i, i + 2));
  return result;
}

function diceSimilarity(left, right) {
  const a = diceBigrams(left);
  const b = diceBigrams(right);
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const counts = new Map();
  for (const pair of a) counts.set(pair, (counts.get(pair) || 0) + 1);
  let matches = 0;
  for (const pair of b) {
    const count = counts.get(pair) || 0;
    if (count > 0) {
      matches += 1;
      counts.set(pair, count - 1);
    }
  }
  return (2 * matches) / (a.length + b.length);
}

function weightedSimilarity(source, candidate) {
  const title = Math.max(jaccard(source.title, candidate.title), diceSimilarity(source.title, candidate.title));
  const h1 = Math.max(jaccard(source.h1, candidate.h1), diceSimilarity(source.h1, candidate.h1));
  const meta = jaccard(source.metaDescription, candidate.metaDescription);
  const content = jaccard(source.content, candidate.content);
  const slug = jaccard(String(source.slug || "").replace(/-/g, " "), String(candidate.slug || "").replace(/-/g, " "));
  const score = (title * 0.28) + (h1 * 0.24) + (content * 0.28) + (meta * 0.12) + (slug * 0.08);
  return {
    score: Number(score.toFixed(4)),
    components: {
      title: Number(title.toFixed(4)),
      h1: Number(h1.toFixed(4)),
      content: Number(content.toFixed(4)),
      meta: Number(meta.toFixed(4)),
      slug: Number(slug.toFixed(4))
    }
  };
}

module.exports = { normalizeText, tokenize, jaccard, diceSimilarity, weightedSimilarity };
