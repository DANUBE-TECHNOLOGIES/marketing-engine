"use strict";

function compact(value) {
  if (Array.isArray(value)) {
    return value.filter(
      (item) => item !== null && item !== undefined && item !== ""
    );
  }

  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => {
        if (item === null || item === undefined || item === "") return false;
        if (Array.isArray(item) && item.length === 0) return false;
        if (
          item &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          Object.keys(item).length === 0
        ) {
          return false;
        }
        return true;
      })
  );
}

function calculateCompleteness(destination) {
  const checks = [
    ["summary", Boolean(destination.summary)],
    ["tagline", Boolean(destination.tagline)],
    ["seoTitle", Boolean(destination.seoTitle)],
    ["seoDescription", Boolean(destination.seoDescription)],
    ["bestTime", Boolean(destination.bestTime)],
    ["idealDuration", Boolean(destination.idealDuration)],
    ["currency", Boolean(destination.currency)],
    ["language", Boolean(destination.language)],
    ["coordinates", Number.isFinite(destination.latitude) &&
      Number.isFinite(destination.longitude)],
    ["highlights", Array.isArray(destination.highlights) &&
      destination.highlights.length > 0],
    ["audiences", Array.isArray(destination.audiences) &&
      destination.audiences.length > 0],
    ["sections", Array.isArray(destination.sections) &&
      destination.sections.length > 0],
    ["faqs", Array.isArray(destination.faqs) &&
      destination.faqs.length > 0],
    ["themes", Array.isArray(destination.themes) &&
      destination.themes.length > 0],
    ["relations", Array.isArray(destination.relationsFrom) &&
      destination.relationsFrom.length > 0],
  ];

  const completed = checks.filter(([, result]) => result).length;
  const score = Math.round((completed / checks.length) * 100);

  return {
    score,
    completed,
    total: checks.length,
    missing: checks
      .filter(([, result]) => !result)
      .map(([name]) => name),
  };
}

function buildDestinationContext(destination, options = {}) {
  if (!destination) {
    throw new Error("Destination context requires a destination");
  }

  const includeRaw = options.includeRaw === true;

  const context = {
    identity: {
      id: destination.id,
      name: destination.name,
      slug: destination.slug,
      type: destination.type,
      status: destination.status,
      tagline: destination.tagline,
      summary: destination.summary,
    },

    geography: {
      country: destination.countryRef
        ? {
            id: destination.countryRef.id,
            name: destination.countryRef.name,
            slug: destination.countryRef.slug,
            iso2: destination.countryRef.iso2,
            iso3: destination.countryRef.iso3,
            continent: destination.countryRef.continent,
          }
        : {
            name: destination.country,
          },

      region: destination.regionRef
        ? {
            id: destination.regionRef.id,
            name: destination.regionRef.name,
            slug: destination.regionRef.slug,
          }
        : destination.region
          ? { name: destination.region }
          : null,

      city: destination.cityRef
        ? {
            id: destination.cityRef.id,
            name: destination.cityRef.name,
            slug: destination.cityRef.slug,
          }
        : null,

      coordinates:
        Number.isFinite(destination.latitude) &&
        Number.isFinite(destination.longitude)
          ? {
              latitude: destination.latitude,
              longitude: destination.longitude,
            }
          : null,
    },

    practical: {
      bestTime: destination.bestTime,
      idealDuration: destination.idealDuration,
      currency:
        destination.currency ||
        destination.countryRef?.currency ||
        null,
      language:
        destination.language ||
        destination.countryRef?.languages?.[0] ||
        null,
      timezone: destination.countryRef?.timezone || null,
    },

    marketing: {
      highlights: destination.highlights || [],
      audiences: destination.audiences || [],
      themes: (destination.themes || []).map((relation) => ({
        id: relation.theme?.id,
        name: relation.theme?.name,
        slug: relation.theme?.slug,
        weight: relation.weight,
      })),
      travelTypes: (destination.travelTypes || []).map((relation) => ({
        id: relation.travelType?.id,
        name: relation.travelType?.name,
        slug: relation.travelType?.slug,
        weight: relation.weight,
      })),
      tags: (destination.tags || []).map((relation) => ({
        id: relation.tag?.id,
        name: relation.tag?.name,
        slug: relation.tag?.slug,
      })),
    },

    seo: {
      title: destination.seoTitle,
      description: destination.seoDescription,
      canonicalSlug: destination.slug,
      suggestedPath: `/destinations/${destination.slug}`,
    },

    content: {
      sections: (destination.sections || []).map((section) => ({
        key: section.key,
        position: section.position,
        type: section.type,
        title: section.title,
        content: section.content,
      })),

      faqs: (destination.faqs || []).map((faq) => ({
        position: faq.position,
        question: faq.question,
        answer: faq.answer,
      })),
    },

    relatedDestinations: (destination.relationsFrom || []).map(
      (relation) => ({
        relationType: relation.relationType,
        score: relation.score,
        origin: relation.origin,
        destination: relation.target
          ? {
              id: relation.target.id,
              name: relation.target.name,
              slug: relation.target.slug,
              country: relation.target.country,
              type: relation.target.type,
              tagline: relation.target.tagline,
            }
          : null,
      })
    ),

    completeness: calculateCompleteness(destination),
  };

  if (includeRaw) {
    context.raw = destination;
  }

  return compact(context);
}

module.exports = {
  buildDestinationContext,
  calculateCompleteness,
  compact,
};
