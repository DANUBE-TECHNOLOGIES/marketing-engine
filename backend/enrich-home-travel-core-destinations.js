"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const TENANT_ID = "tenant_mondescale";

const DESTINATIONS = [
  {
    slug: "ile-maurice",
    name: "Île Maurice",
    country: "Maurice",
    type: "island",
    tagline: "Lagons, douceur de vivre et hospitalité mauricienne",
    summary: "Une destination de l'océan Indien adaptée aux séjours balnéaires, aux voyages en couple et aux vacances en famille.",
    heroImageUrl: "https://unsplash.com/photos/ByAHlRiTQjo/download?force=true&w=1800",
    bestTime: "Mai à décembre",
    idealDuration: "8 à 12 jours",
    currency: "MUR",
    language: "français",
    highlights: ["lagons", "plages", "randonnées", "gastronomie"],
    audiences: ["couples", "familles", "voyages de noces", "luxe"],
    imageAttribution: { provider: "Unsplash", photoId: "ByAHlRiTQjo", author: "Xavier Coiffic" },
  },
  {
    slug: "seychelles",
    name: "Seychelles",
    country: "Seychelles",
    type: "archipelago",
    tagline: "Un archipel préservé aux plages spectaculaires",
    summary: "Les Seychelles réunissent plages granitiques, nature tropicale et hébergements de charme.",
    heroImageUrl: "https://unsplash.com/photos/jPmurJKSL_0/download?force=true&w=1800",
    bestTime: "Toute l'année, avec intersaisons privilégiées",
    idealDuration: "9 à 14 jours",
    currency: "SCR",
    language: "français",
    highlights: ["plages", "nature", "îles", "snorkeling"],
    audiences: ["couples", "voyages de noces", "nature", "luxe"],
    imageAttribution: { provider: "Unsplash", photoId: "jPmurJKSL_0", author: "Christian Cacciamani" },
  },
  {
    slug: "maldives",
    name: "Maldives",
    country: "Maldives",
    type: "archipelago",
    tagline: "Des atolls d'exception au cœur de l'océan Indien",
    summary: "Les Maldives offrent des séjours insulaires centrés sur les lagons, la plongée et les hôtels-resorts.",
    heroImageUrl: "https://unsplash.com/photos/xPsFXsbXJRg/download?force=true&w=1800",
    bestTime: "Novembre à avril",
    idealDuration: "7 à 10 jours",
    currency: "MVR",
    language: "divehi",
    highlights: ["lagons", "plongée", "villas sur pilotis", "resorts"],
    audiences: ["couples", "voyages de noces", "plongée", "luxe"],
    imageAttribution: { provider: "Unsplash", photoId: "xPsFXsbXJRg", author: "Rayyu Maldives" },
  },
  {
    slug: "thailande",
    name: "Thaïlande",
    country: "Thaïlande",
    type: "country",
    tagline: "Plages tropicales, culture et art de vivre asiatique",
    summary: "La Thaïlande combine temples, villes animées, îles tropicales et une grande diversité d'expériences de voyage.",
    heroImageUrl: "https://unsplash.com/photos/sydwCr54rf0/download?force=true&w=1800",
    bestTime: "Novembre à mars",
    idealDuration: "10 à 15 jours",
    currency: "THB",
    language: "thaï",
    highlights: ["Bangkok", "temples", "îles", "gastronomie"],
    audiences: ["couples", "familles", "circuits", "voyage sur mesure"],
    imageAttribution: { provider: "Unsplash", photoId: "sydwCr54rf0", author: "Robin Noguier" },
  },
  {
    slug: "republique-dominicaine",
    name: "République dominicaine",
    country: "République dominicaine",
    type: "country",
    tagline: "Caraïbes, plages de sable blanc et douceur tropicale",
    summary: "La République dominicaine associe grands resorts, plages caribéennes, nature tropicale et culture locale.",
    heroImageUrl: "https://unsplash.com/photos/uwIqm8Pe2to/download?force=true&w=1800",
    bestTime: "Décembre à avril",
    idealDuration: "8 à 12 jours",
    currency: "DOP",
    language: "espagnol",
    highlights: ["Punta Cana", "plages", "Caraïbes", "nature"],
    audiences: ["couples", "familles", "séjours balnéaires", "tout compris"],
    imageAttribution: { provider: "Unsplash", photoId: "uwIqm8Pe2to", author: "Asael Peña" },
  },
  {
    slug: "canaries",
    name: "Canaries",
    country: "Espagne",
    region: "Îles Canaries",
    type: "archipelago",
    tagline: "Des îles volcaniques baignées de soleil toute l'année",
    summary: "Les Canaries offrent plages, paysages volcaniques et climat doux à quelques heures de la France.",
    heroImageUrl: "https://unsplash.com/photos/Kzd9UqhaMjU/download?force=true&w=1800",
    bestTime: "Toute l'année",
    idealDuration: "7 à 10 jours",
    currency: "EUR",
    language: "espagnol",
    highlights: ["Tenerife", "Lanzarote", "Fuerteventura", "paysages volcaniques"],
    audiences: ["couples", "familles", "randonnée", "séjours balnéaires"],
    imageAttribution: { provider: "Unsplash", photoId: "Kzd9UqhaMjU", author: "Zinah Insignia" },
  },
];

function desiredData(destination, existing = null) {
  const currentMetadata = existing?.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
    ? existing.metadata
    : {};

  return {
    tenantId: TENANT_ID,
    name: destination.name,
    slug: destination.slug,
    country: destination.country,
    region: destination.region || existing?.region || null,
    type: destination.type,
    status: "published",
    tagline: destination.tagline,
    summary: destination.summary,
    heroImageUrl: destination.heroImageUrl,
    seoTitle: existing?.seoTitle || `Voyage ${destination.name} avec Mondescale`,
    seoDescription: existing?.seoDescription || `Préparez votre voyage ${destination.name} avec Mondescale : conseils, inspirations et accompagnement personnalisé.`,
    bestTime: destination.bestTime,
    idealDuration: destination.idealDuration,
    currency: destination.currency,
    language: destination.language,
    highlights: destination.highlights,
    audiences: destination.audiences,
    publishedAt: existing?.publishedAt || new Date(),
    metadata: {
      ...currentMetadata,
      source: currentMetadata.source || "mondescale",
      version: Math.max(Number(currentMetadata.version) || 0, 1),
      heroMedia: {
        ...destination.imageAttribution,
        sourceUrl: destination.heroImageUrl,
        curatedFor: "home-destination-grid",
      },
    },
  };
}

(async () => {
  console.log("===== ENRICHISSEMENT TRAVEL CORE DESTINATIONS HOME =====");
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const existingRows = await prisma.destination.findMany({
    where: {
      tenantId: TENANT_ID,
      slug: { in: DESTINATIONS.map((item) => item.slug) },
    },
  });
  const existingBySlug = new Map(existingRows.map((item) => [item.slug, item]));

  const plan = DESTINATIONS.map((destination) => {
    const existing = existingBySlug.get(destination.slug) || null;
    return {
      name: destination.name,
      slug: destination.slug,
      action: existing ? "UPDATE" : "CREATE",
      currentStatus: existing?.status || "ABSENT",
      currentImage: existing?.heroImageUrl ? "YES" : "NO",
      targetImage: "YES",
      targetStatus: "published",
    };
  });

  console.table(plan);

  if (!APPLY) {
    console.log("\nAucune donnée modifiée. Relancer avec --apply après validation du tableau ci-dessus.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const destination of DESTINATIONS) {
      const existing = existingBySlug.get(destination.slug) || null;
      const data = desiredData(destination, existing);

      if (existing) {
        await tx.destination.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            country: data.country,
            region: data.region,
            type: data.type,
            status: data.status,
            tagline: data.tagline,
            summary: data.summary,
            heroImageUrl: data.heroImageUrl,
            seoTitle: data.seoTitle,
            seoDescription: data.seoDescription,
            bestTime: data.bestTime,
            idealDuration: data.idealDuration,
            currency: data.currency,
            language: data.language,
            highlights: data.highlights,
            audiences: data.audiences,
            publishedAt: data.publishedAt,
            metadata: data.metadata,
          },
        });
      } else {
        await tx.destination.create({ data });
      }
    }
  });

  const finalRows = await prisma.destination.findMany({
    where: {
      tenantId: TENANT_ID,
      slug: { in: DESTINATIONS.map((item) => item.slug) },
    },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      status: true,
      heroImageUrl: true,
      publishedAt: true,
    },
  });

  console.log("\n===== CONTROLE FINAL =====");
  console.table(finalRows.map((item) => ({
    name: item.name,
    slug: item.slug,
    status: item.status,
    image: item.heroImageUrl ? "YES" : "NO",
    published: Boolean(item.publishedAt),
  })));
})();

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
