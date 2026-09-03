"use strict";

function clean(value, maximum = 1200) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function uniqueStrings(values, maximum = 20) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) => {
          if (
            value &&
            typeof value === "object"
          ) {
            return clean(
              value.name ||
              value.label ||
              value.title ||
              value.slug,
              180
            );
          }

          return clean(value, 180);
        })
        .filter(Boolean)
    ),
  ].slice(0, maximum);
}

function normalizeBudget(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const minimum = Number(
    value.minimum ??
    value.min ??
    value.from
  );

  const maximum = Number(
    value.maximum ??
    value.max ??
    value.to
  );

  if (
    !Number.isFinite(minimum) &&
    !Number.isFinite(maximum)
  ) {
    return null;
  }

  return {
    minimum:
      Number.isFinite(minimum)
        ? minimum
        : null,

    maximum:
      Number.isFinite(maximum)
        ? maximum
        : null,

    currency:
      clean(
        value.currency || "EUR",
        10
      ),
  };
}

function normalizeTravelContext(
  source,
  requestedDestination
) {
  if (
    !source ||
    typeof source !== "object"
  ) {
    return {
      available: false,
      source: "travel-core",
      destination:
        clean(
          requestedDestination,
          180
        ),
      destinationId: null,
      slug: null,
      sourceFields: [],
      facts: {},
    };
  }

  const climate =
    source.climate ||
    source.weather ||
    source.seasonality ||
    {};

  const practical =
    source.practical ||
    source.practicalInfo ||
    source.information ||
    {};

  const facts = {
    country:
      clean(
        source.country?.name ||
        source.countryName ||
        source.country,
        180
      ) || null,

    continent:
      clean(
        source.continent?.name ||
        source.continentName ||
        source.continent,
        180
      ) || null,

    region:
      clean(
        source.region?.name ||
        source.regionName ||
        source.region,
        180
      ) || null,

    capital:
      clean(
        source.capital,
        180
      ) || null,

    currency:
      clean(
        practical.currency ||
        source.currency,
        100
      ) || null,

    language:
      clean(
        practical.language ||
        practical.languages ||
        source.language,
        180
      ) || null,

    flightDuration:
      clean(
        practical.flightDuration ||
        source.flightDuration ||
        source.travelTime,
        180
      ) || null,

    timeDifference:
      clean(
        practical.timeDifference ||
        source.timeDifference ||
        source.timezoneDifference,
        180
      ) || null,

    formalities:
      clean(
        practical.formalities ||
        source.formalities ||
        source.entryRequirements,
        1600
      ) || null,

    health:
      clean(
        practical.health ||
        source.health ||
        source.healthAdvice,
        1600
      ) || null,

    description:
      clean(
        source.description ||
        source.summary ||
        source.introduction,
        2200
      ) || null,

    bestMonths:
      uniqueStrings(
        climate.bestMonths ||
        climate.recommendedMonths ||
        source.bestMonths,
        12
      ),

    avoidMonths:
      uniqueStrings(
        climate.avoidMonths ||
        climate.unfavorableMonths ||
        source.avoidMonths,
        12
      ),

    themes:
      uniqueStrings(
        source.themes ||
        source.tags ||
        source.interests ||
        source.taxonomy,
        20
      ),

    highlights:
      uniqueStrings(
        source.highlights ||
        source.mustSee ||
        source.experiences ||
        source.attractions,
        20
      ),

    suitableFor:
      uniqueStrings(
        source.suitableFor ||
        source.audiences ||
        source.travelerTypes,
        15
      ),

    budget:
      normalizeBudget(
        source.budget ||
        source.budgetRange ||
        source.priceRange
      ),
  };

  const sourceFields =
    Object.entries(facts)
      .filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }

        return (
          value !== null &&
          value !== ""
        );
      })
      .map(([field]) => field);

  return {
    available:
      sourceFields.length > 0,

    source:
      "travel-core",

    destination:
      clean(
        source.name ||
        source.title ||
        requestedDestination,
        180
      ),

    destinationId:
      clean(
        source.id ||
        source.destinationId,
        180
      ) || null,

    slug:
      clean(
        source.slug,
        180
      ) || null,

    sourceFields,
    facts,
  };
}

function loadTravelCoreModule() {
  const candidates = [
    "../travel-core/service",
    "../travel-core",
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // Essai du chemin suivant.
    }
  }

  return null;
}

function instantiateTravelCore(moduleValue) {
  if (!moduleValue) {
    return null;
  }

  const candidate =
    moduleValue.TravelCoreService ||
    moduleValue.service ||
    moduleValue.default ||
    moduleValue;

  if (typeof candidate === "function") {
    try {
      return new candidate();
    } catch {
      return candidate;
    }
  }

  if (
    candidate &&
    typeof candidate === "object"
  ) {
    return candidate;
  }

  return null;
}

async function callTravelCore(
  service,
  destination
) {
  if (!service) {
    return null;
  }

  const calls = [
    {
      method:
        "getDestinationContext",
      arguments:
        [destination],
    },
    {
      method:
        "findDestinationByName",
      arguments:
        [destination],
    },
    {
      method:
        "findDestination",
      arguments:
        [destination],
    },
    {
      method:
        "getDestination",
      arguments:
        [destination],
    },
    {
      method:
        "searchDestination",
      arguments:
        [destination],
    },
    {
      method:
        "search",
      arguments: [
        {
          query: destination,
          limit: 5,
        },
      ],
    },
  ];

  for (const call of calls) {
    if (
      typeof service[call.method] !==
      "function"
    ) {
      continue;
    }

    try {
      const result =
        await service[call.method](
          ...call.arguments
        );

      if (Array.isArray(result)) {
        return result[0] || null;
      }

      if (
        Array.isArray(result?.items)
      ) {
        return result.items[0] || null;
      }

      if (
        Array.isArray(
          result?.destinations
        )
      ) {
        return (
          result.destinations[0] ||
          null
        );
      }

      if (result?.destination) {
        return result.destination;
      }

      if (result) {
        return result;
      }
    } catch {
      // Une autre méthode du service peut être compatible.
    }
  }

  return null;
}

class TravelCoreContextResolver {
  constructor(options = {}) {
    if (
      Object.prototype.hasOwnProperty.call(
        options,
        "travelCore"
      )
    ) {
      this.travelCore =
        options.travelCore;
    } else {
      this.travelCore =
        instantiateTravelCore(
          loadTravelCoreModule()
        );
    }
  }

  async resolve(destination) {
    const normalizedDestination =
      clean(destination, 180);

    if (!normalizedDestination) {
      return normalizeTravelContext(
        null,
        ""
      );
    }

    const source =
      await callTravelCore(
        this.travelCore,
        normalizedDestination
      );

    return normalizeTravelContext(
      source,
      normalizedDestination
    );
  }
}

module.exports = {
  TravelCoreContextResolver,
  callTravelCore,
  clean,
  instantiateTravelCore,
  loadTravelCoreModule,
  normalizeBudget,
  normalizeTravelContext,
  uniqueStrings,
};
