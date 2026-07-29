function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value = '') {
  return normalizeText(value).replace(/\s+/g, '-');
}

function tokens(value = '') {
  return new Set(normalizeText(value).split(/\s+/).filter((token) => token.length > 2));
}

function similarity(left = '', right = '') {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

module.exports = { normalizeText, slugify, similarity };
