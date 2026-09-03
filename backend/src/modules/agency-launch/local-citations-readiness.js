"use strict";

const CITATION_FIELDS = [
  ["nameCorrect", "nom"],
  ["addressCorrect", "adresse"],
  ["phoneCorrect", "téléphone"],
  ["websiteCorrect", "site web"],
  ["hoursCorrect", "horaires"],
  ["categoryCorrect", "catégorie"],
];

function citationConsistencyCheck(listings = []) {
  const active = (listings || []).filter((listing) => listing?.directory?.active !== false);
  const published = active.filter((listing) => String(listing?.listingUrl || "").trim());
  const inconsistencies = [];

  for (const listing of published) {
    const fields = CITATION_FIELDS
      .filter(([key]) => listing?.[key] !== true)
      .map(([, label]) => label);

    if (!fields.length) continue;

    inconsistencies.push({
      listingId: listing.id,
      directory: listing?.directory?.name || "Annuaire",
      listingUrl: listing.listingUrl,
      fields,
      lastCheckedAt: listing.lastCheckedAt || null,
    });
  }

  const consistentListings = published.length - inconsistencies.length;
  const consistencyRate = published.length
    ? consistentListings / published.length
    : 0;
  const passed = published.length > 0 && inconsistencies.length === 0;

  return {
    code: "LOCAL_CITATIONS",
    label: "Cohérence des citations locales",
    required: false,
    passed,
    activeListings: active.length,
    publishedListings: published.length,
    consistentListings,
    consistencyRate: Math.round(consistencyRate * 1000) / 1000,
    inconsistencies: inconsistencies.slice(0, 20),
    recommendation: passed
      ? null
      : published.length === 0
        ? "Créer et vérifier des citations locales de qualité avec le même nom, la même adresse, le même téléphone et le même site que le mini-site et Google Business Profile."
        : "Corriger les annuaires signalés afin que le nom, l'adresse, le téléphone, le site, les horaires et la catégorie restent cohérents avec l'identité officielle de l'agence.",
  };
}

async function localCitationsReadiness(database, tenantId, agencyId) {
  const listings = await database.directoryListing.findMany({
    where: {
      agencyId: Number(agencyId),
      agency: { tenantId },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      listingUrl: true,
      status: true,
      nameCorrect: true,
      addressCorrect: true,
      phoneCorrect: true,
      websiteCorrect: true,
      hoursCorrect: true,
      categoryCorrect: true,
      lastCheckedAt: true,
      updatedAt: true,
      directory: {
        select: {
          name: true,
          website: true,
          active: true,
          impactScore: true,
        },
      },
    },
  });

  return citationConsistencyCheck(listings);
}

function applyLocalCitationsToReadiness(report, check) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  return {
    ...report,
    version: "2.1",
    checks: [
      ...checks.filter((item) => item?.code !== "LOCAL_CITATIONS"),
      check,
    ],
  };
}

module.exports = {
  CITATION_FIELDS,
  citationConsistencyCheck,
  localCitationsReadiness,
  applyLocalCitationsToReadiness,
};
