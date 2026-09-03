"use strict";

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function collectNamedItems(value, output = []) {
  if (!value) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectNamedItems(item, output);
    return output;
  }
  if (typeof value !== "object") return output;

  const name = String(value.name || "").trim();
  const role = String(value.role || value.jobTitle || "").trim();
  if (name && name.length <= 80) output.push({ name, role: role || null });

  for (const child of Object.values(value)) collectNamedItems(child, output);
  return output;
}

function extractTeam(page) {
  const members = [];
  for (const block of page?.blocks || []) {
    const type = String(block?.blockType || "").toLowerCase();
    if (type !== "team") continue;
    collectNamedItems(block?.content?.members || block?.content || {}, members);
  }
  const seen = new Set();
  return members.filter((member) => {
    const key = member.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function reviewEvidence(agency) {
  const reviews = Array.isArray(agency?.reviews) ? agency.reviews : [];
  if (!reviews.length) return null;
  const average = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
  const commentsAvailable = reviews.filter((review) => String(review.comment || "").trim()).length;
  return {
    observedCount: reviews.length,
    averageRating: Number(average.toFixed(1)),
    commentsAvailable,
    source: "google-reviews"
  };
}

function buildLocalEvidence(page) {
  const agency = page?.site?.agency || {};
  const keywordCities = unique((agency.keywords || []).map((item) => item.city)).slice(0, 8);
  const keywords = unique((agency.keywords || []).map((item) => item.keyword)).slice(0, 12);
  const team = extractTeam(page);
  const reviews = reviewEvidence(agency);

  const evidence = [];
  if (agency.city) evidence.push({ code: "CITY", label: "Ville", value: agency.city, source: "agency" });
  if (agency.postalCode) evidence.push({ code: "POSTAL_CODE", label: "Code postal", value: agency.postalCode, source: "agency" });
  if (agency.address) evidence.push({ code: "ADDRESS", label: "Implantation", value: agency.address, source: "agency" });
  if (team.length) evidence.push({ code: "TEAM", label: "Équipe identifiée", value: team.map((member) => member.role ? `${member.name} — ${member.role}` : member.name).join(", "), source: "designer" });
  if (reviews) evidence.push({ code: "REVIEWS", label: "Avis observés", value: `${reviews.observedCount} avis 4–5★ observés, moyenne ${reviews.averageRating}/5`, source: "google-reviews" });
  if (keywordCities.length) evidence.push({ code: "LOCAL_CITIES", label: "Villes déjà suivies en SEO", value: keywordCities.join(", "), source: "ranking-keywords" });
  if (keywords.length) evidence.push({ code: "SEO_KEYWORDS", label: "Requêtes locales suivies", value: keywords.join(", "), source: "ranking-keywords" });

  return {
    version: "1.0",
    agencyId: agency.id ?? page?.site?.agencyId ?? null,
    agencyName: agency.name || page?.site?.name || null,
    city: agency.city || null,
    seoLevel: agency.seoLevel || null,
    evidence,
    team,
    reviews,
    keywordCities,
    keywords,
    guidance: evidence.length
      ? "Utiliser uniquement ces éléments vérifiés pour différencier le contenu. Ne pas inventer de spécialité, chiffre, partenariat ou zone de clientèle non présent dans les données."
      : "Aucune preuve locale structurée suffisante n'est disponible : enrichir d'abord les données agence avant de générer du contenu spécifique."
  };
}

module.exports = { buildLocalEvidence, extractTeam, reviewEvidence };
