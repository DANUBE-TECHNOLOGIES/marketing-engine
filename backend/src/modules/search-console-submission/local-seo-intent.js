"use strict";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asTerms(value) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeText)
    .filter(Boolean);
}

function includesPhrase(text, phrase) {
  const normalized = normalizeText(phrase);
  return Boolean(normalized) && ` ${text} `.includes(` ${normalized} `);
}

function scoreLocalIntent(query, context = {}) {
  const text = normalizeText(query);
  if (!text) return { score: 0, level: "none", matches: [] };

  let score = 0;
  const matches = [];
  const primaryCity = normalizeText(context.primaryCity);
  const targetCities = asTerms(context.targetCities).filter((city) => city !== primaryCity);
  const agencyName = normalizeText(context.agencyName);
  const postalCode = normalizeText(context.postalCode);

  if (primaryCity && includesPhrase(text, primaryCity)) {
    score += 45;
    matches.push({ type: "primary-city", value: context.primaryCity });
  } else {
    const target = targetCities.find((city) => includesPhrase(text, city));
    if (target) {
      score += 30;
      matches.push({ type: "target-city", value: target });
    }
  }

  if (postalCode && includesPhrase(text, postalCode)) {
    score += 20;
    matches.push({ type: "postal-code", value: context.postalCode });
  }

  if (agencyName && agencyName.length >= 5 && includesPhrase(text, agencyName)) {
    score += 15;
    matches.push({ type: "agency-name", value: context.agencyName });
  }

  const commercialPhrases = ["agence de voyage", "agence voyage", "agence voyages", "agence de voyages", "voyagiste", "conseiller voyage", "conseillere voyage"];
  const commercial = commercialPhrases.find((phrase) => includesPhrase(text, phrase));
  if (commercial) {
    score += 25;
    matches.push({ type: "local-commercial-intent", value: commercial });
  } else {
    const travelTerms = ["voyage", "voyages", "sejour", "circuit", "croisiere", "vacances"];
    const travel = travelTerms.find((term) => includesPhrase(text, term));
    if (travel) {
      score += 10;
      matches.push({ type: "travel-intent", value: travel });
    }
  }

  const proximityPhrases = ["pres de", "proche de", "autour de", "a cote de"];
  const proximity = proximityPhrases.find((phrase) => includesPhrase(text, phrase));
  if (proximity) {
    score += 10;
    matches.push({ type: "proximity-intent", value: proximity });
  }

  const finalScore = Math.min(100, score);
  return {
    score: finalScore,
    level: finalScore >= 70 ? "strong" : finalScore >= 40 ? "medium" : finalScore > 0 ? "weak" : "none",
    matches,
  };
}

async function resolveLocalSeoContext(prisma, tenantId, siteSlug) {
  const slug = String(siteSlug || "").trim();
  if (!prisma || !tenantId || !slug) return null;
  const site = await prisma.miniSite.findFirst({ where: { tenantId, slug } });
  if (!site) return null;
  const agencyId = Number.parseInt(String(site.agencyId || ""), 10);
  if (!Number.isFinite(agencyId)) return { siteSlug: slug, agencyName: site.name || null, primaryCity: null, targetCities: [] };

  const [agency, seoSite] = await Promise.all([
    prisma.agency.findFirst({ where: { tenantId, id: agencyId } }),
    prisma.agencySeoSite.findUnique({ where: { agencyId } }).catch(() => null),
  ]);
  const configuredTargets = Array.isArray(seoSite?.targetCities) ? seoSite.targetCities : [];
  return {
    siteSlug: slug,
    agencyName: agency?.name || site.name || null,
    primaryCity: seoSite?.seoCity || agency?.city || null,
    postalCode: agency?.postalCode || null,
    targetCities: configuredTargets,
  };
}

module.exports = { normalizeText, scoreLocalIntent, resolveLocalSeoContext };
