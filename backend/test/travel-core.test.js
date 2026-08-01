"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TravelCoreService,
  parseLimit,
  requireSearchQuery,
} = require("../src/modules/travel-core");

test("parseLimit applique les limites", () => {
  assert.equal(parseLimit(undefined), 100);
  assert.equal(parseLimit("25"), 25);
  assert.equal(parseLimit("999", 100, 500), 500);
});

test("requireSearchQuery refuse une recherche trop courte", () => {
  assert.throws(() => requireSearchQuery("a"), {
    code: "INVALID_SEARCH_QUERY",
  });
});

test("TravelCoreService retourne une recherche unifiée", async () => {
  const repository = {
    search: async () => ({
      countries: [
        { id: "country-1", slug: "maurice", name: "Maurice", continent: "Afrique" },
      ],
      regions: [],
      cities: [],
      destinations: [
        {
          id: "destination-1",
          slug: "ile-maurice",
          name: "Île Maurice",
          country: "Maurice",
          countryRef: { name: "Maurice" },
          regionRef: null,
          cityRef: null,
        },
      ],
    }),
  };

  const service = new TravelCoreService(repository);
  const result = await service.search({ q: "Maurice" });

  assert.equal(result.count, 2);
  assert.equal(result.byType.country, 1);
  assert.equal(result.byType.destination, 1);
  assert.equal(result.items[0].type, "country");
});

test("TravelCoreService signale une destination absente", async () => {
  const service = new TravelCoreService({
    findDestination: async () => null,
  });

  await assert.rejects(
    () => service.getDestination("inconnue"),
    { code: "DESTINATION_NOT_FOUND" }
  );
});

const {
  parseCsv,
  parsePayload,
  slugify,
  TravelCoreImporter,
} = require("../src/modules/travel-core");

test("slugify normalise les accents et caractères spéciaux", () => {
  assert.equal(slugify("Île Maurice"), "ile-maurice");
  assert.equal(slugify("Ozoir-la-Ferrière"), "ozoir-la-ferriere");
});

test("parseCsv accepte le point-virgule", () => {
  const rows = parseCsv(
    "name;iso2;continent\nMaurice;MU;Afrique\nSeychelles;SC;Afrique"
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "Maurice");
  assert.equal(rows[1].iso2, "SC");
});

test("parsePayload active le dry-run par défaut", () => {
  const input = parsePayload({
    entityType: "countries",
    format: "json",
    data: [{ name: "Maurice" }],
  });

  assert.equal(input.dryRun, true);
  assert.equal(input.rows.length, 1);
});

test("TravelCoreImporter simule l'import d'un pays", async () => {
  const prisma = {
    country: {
      findUnique: async () => null,
    },
  };

  const importer = new TravelCoreImporter(prisma, "tenant_mondescale");

  const report = await importer.import({
    entityType: "countries",
    format: "json",
    dryRun: true,
    data: [
      {
        name: "Maurice",
        iso2: "MU",
        iso3: "MUS",
        continent: "Afrique",
      },
    ],
  });

  assert.equal(report.created, 1);
  assert.equal(report.failed, 0);
  assert.equal(report.items[0].slug, "maurice");
});

const {
  normalizeSearchValue,
  calculateScore,
  mergeSearchItems,
} = require("../src/modules/travel-core");

test("normalizeSearchValue supprime les accents", () => {
  assert.equal(normalizeSearchValue("Île Maurice"), "ile maurice");
});

test("calculateScore privilégie une correspondance exacte", () => {
  const exact = calculateScore("Maurice", {
    type: "country",
    name: "Maurice",
    slug: "maurice",
    status: "published",
  });

  const partial = calculateScore("Maurice", {
    type: "destination",
    name: "Voyage à Maurice",
    slug: "voyage-maurice",
    status: "published",
  });

  assert.ok(exact > partial);
});

test("mergeSearchItems déduplique les correspondances alias", () => {
  const direct = [
    {
      type: "country",
      id: "country-1",
      name: "Maurice",
      slug: "maurice",
      status: "published",
    },
  ];

  const aliases = [
    {
      type: "country",
      id: "country-1",
      name: "Maurice",
      slug: "maurice",
      status: "published",
    },
  ];

  const results = mergeSearchItems("République de Maurice", direct, aliases);

  assert.equal(results.length, 1);
  assert.equal(results[0].matchedBy, "alias");
});

const {
  buildDestinationContext,
  calculateCompleteness,
} = require("../src/modules/travel-core");

test("calculateCompleteness identifie les informations manquantes", () => {
  const result = calculateCompleteness({
    summary: "Présentation",
    tagline: "Tagline",
    seoTitle: "Titre",
    seoDescription: "Description",
    bestTime: "Mai à décembre",
    idealDuration: "10 jours",
    currency: "MUR",
    language: "français",
    latitude: -20.2,
    longitude: 57.5,
    highlights: ["lagons"],
    audiences: ["familles"],
    sections: [],
    faqs: [],
    themes: [],
    relationsFrom: [],
  });

  assert.ok(result.score > 50);
  assert.ok(result.missing.includes("faqs"));
  assert.ok(result.missing.includes("relations"));
});

test("buildDestinationContext consolide les données voyage", () => {
  const context = buildDestinationContext({
    id: "destination-1",
    name: "Île Maurice",
    slug: "ile-maurice",
    type: "island",
    status: "published",
    tagline: "Lagons et douceur de vivre",
    summary: "Une destination de l'océan Indien.",
    seoTitle: "Voyage à l'Île Maurice",
    seoDescription: "Découvrez l'Île Maurice.",
    bestTime: "Mai à décembre",
    idealDuration: "8 à 12 jours",
    currency: "MUR",
    language: "français",
    latitude: -20.2,
    longitude: 57.5,
    highlights: ["lagons", "plages"],
    audiences: ["couples", "familles"],
    country: "Maurice",
    countryRef: {
      id: "country-1",
      name: "Maurice",
      slug: "maurice",
      iso2: "MU",
      iso3: "MUS",
      continent: "Afrique",
      currency: "MUR",
      languages: ["français"],
      timezone: "Indian/Mauritius",
    },
    regionRef: null,
    cityRef: null,
    sections: [],
    faqs: [],
    themes: [],
    travelTypes: [],
    tags: [],
    relationsFrom: [],
  });

  assert.equal(context.identity.name, "Île Maurice");
  assert.equal(context.geography.country.iso2, "MU");
  assert.equal(context.practical.timezone, "Indian/Mauritius");
  assert.equal(
    context.seo.suggestedPath,
    "/destinations/ile-maurice"
  );
});
