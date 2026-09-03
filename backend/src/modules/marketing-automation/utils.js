function clean(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function truncate(value, max) {
  const text = clean(value);
  if (!max || text.length <= max) return text;
  const cut = text.slice(0, Math.max(0, max - 1));
  const boundary = cut.lastIndexOf(" ");
  return `${cut.slice(0, boundary > max * 0.65 ? boundary : cut.length).trim()}…`;
}

function unique(values = []) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function slugify(value = "") {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashtags(values = [], limit = 8) {
  return unique(values)
    .map((value) => `#${slugify(value).replace(/-/g, "")}`)
    .filter((value) => value.length > 1)
    .slice(0, limit);
}

function normalizeSource(source = {}) {
  const title = clean(source.title || source.h1 || source.destination || "Inspiration voyage");
  return {
    title,
    h1: clean(source.h1 || title),
    excerpt: clean(source.excerpt || source.summary || source.metaDescription || source.content || ""),
    content: clean(source.content || source.excerpt || source.summary || ""),
    destination: clean(source.destination || source.destinationName || title),
    url: clean(source.url || source.pageUrl || ""),
    agencyName: clean(source.agencyName || "Mondescale Voyages"),
    agencyCity: clean(source.agencyCity || ""),
    phone: clean(source.phone || ""),
    bookingUrl: clean(source.bookingUrl || source.url || ""),
    keywords: unique(source.keywords || source.tags || []),
    highlights: unique(source.highlights || []),
    offer: clean(source.offer || ""),
    price: clean(source.price || ""),
    legal: clean(source.legal || "")
  };
}

module.exports = { clean, truncate, unique, slugify, hashtags, normalizeSource };
