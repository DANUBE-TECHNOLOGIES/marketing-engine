"use strict";

const express = require("express");
const {
  TAXONOMY_TYPES,
  validateTaxonomyPayload,
  buildTaxonomyTree,
  summarizeTaxonomy,
} = require("../lib/taxonomyEngine");

function parseStatus(query) {
  const value = String(query.status || "").trim();
  return value ? { status: value } : {};
}

async function loadTaxonomy(prisma, statusWhere = {}) {
  const [countries, regions, cities, destinations] = await Promise.all([
    prisma.country.findMany({ where: statusWhere, orderBy: { name: "asc" } }),
    prisma.region.findMany({ where: statusWhere, orderBy: { name: "asc" } }),
    prisma.city.findMany({ where: statusWhere, orderBy: { name: "asc" } }),
    prisma.destination.findMany({ where: statusWhere, orderBy: { name: "asc" } }),
  ]);
  return { countries, regions, cities, destinations };
}

function createTaxonomyRoutes(prisma) {
  if (!prisma) throw new Error("Taxonomy Engine requires Prisma");
  const router = express.Router();

  router.get("/taxonomy/health", async (_req, res, next) => {
    try {
      const data = await loadTaxonomy(prisma);
      res.json({ ok: true, version: "1.0.0", capability: "taxonomy-engine", summary: summarizeTaxonomy(data) });
    } catch (error) { next(error); }
  });

  router.get("/taxonomy/stats", async (req, res, next) => {
    try {
      const data = await loadTaxonomy(prisma, parseStatus(req.query));
      res.json({ ok: true, summary: summarizeTaxonomy(data) });
    } catch (error) { next(error); }
  });

  router.get("/taxonomy/tree", async (req, res, next) => {
    try {
      const data = await loadTaxonomy(prisma, parseStatus(req.query));
      res.json({ ok: true, summary: summarizeTaxonomy(data), tree: buildTaxonomyTree(data) });
    } catch (error) { next(error); }
  });

  router.get("/taxonomy/node/:type/:slug", async (req, res, next) => {
    try {
      const type = String(req.params.type || "").toLowerCase();
      const slug = String(req.params.slug || "").toLowerCase();
      if (!TAXONOMY_TYPES.includes(type)) return res.status(400).json({ error: "Type taxonomique invalide." });
      const data = await loadTaxonomy(prisma);
      const tree = buildTaxonomyTree(data);
      let node = null;
      if (type === "continent") node = tree.find((item) => item.slug === slug) || null;
      if (type === "country") node = tree.flatMap((item) => item.countries).find((item) => item.slug === slug) || null;
      if (type === "region") node = tree.flatMap((item) => item.countries).flatMap((item) => item.regions).find((item) => item.slug === slug) || null;
      if (type === "city") {
        const countries = tree.flatMap((item) => item.countries);
        node = countries.flatMap((item) => [...item.cities, ...item.regions.flatMap((region) => region.cities)]).find((item) => item.slug === slug) || null;
      }
      if (type === "destination") node = data.destinations.find((item) => item.slug === slug) || null;
      if (!node) return res.status(404).json({ error: "Nœud taxonomique introuvable." });
      res.json({ ok: true, node });
    } catch (error) { next(error); }
  });

  router.post("/taxonomy/validate", (req, res) => {
    const report = validateTaxonomyPayload(req.body || {});
    res.status(report.ok ? 200 : 422).json(report);
  });

  router.post("/taxonomy/sync", async (req, res, next) => {
    try {
      const { dryRun = false, overwrite = true } = req.body || {};
      const report = validateTaxonomyPayload(req.body || {});
      if (!report.ok) return res.status(422).json(report);
      if (dryRun) return res.json({ ...report, dryRun: true });

      const summary = { countries: 0, regions: 0, cities: 0, destinations: 0 };
      await prisma.$transaction(async (tx) => {
        for (const continent of report.taxonomy.continents) {
          for (const countryInput of continent.countries) {
            const countryData = {
              name: countryInput.name,
              continent: continent.name,
              iso2: countryInput.iso2,
              iso3: countryInput.iso3,
              currency: countryInput.currency || null,
              languages: Array.isArray(countryInput.languages) ? countryInput.languages : [],
              timezone: countryInput.timezone || null,
              status: countryInput.status,
              metadata: countryInput.metadata || undefined,
            };
            const country = await tx.country.upsert({
              where: { slug: countryInput.slug },
              create: { slug: countryInput.slug, ...countryData },
              update: overwrite ? countryData : {},
            });
            summary.countries += 1;

            for (const regionInput of countryInput.regions) {
              const regionData = { name: regionInput.name, code: regionInput.code || null, status: regionInput.status, metadata: regionInput.metadata || undefined };
              const region = await tx.region.upsert({
                where: { countryId_slug: { countryId: country.id, slug: regionInput.slug } },
                create: { countryId: country.id, slug: regionInput.slug, ...regionData },
                update: overwrite ? regionData : {},
              });
              summary.regions += 1;
              for (const cityInput of regionInput.cities) {
                const city = await tx.city.upsert({
                  where: { countryId_slug: { countryId: country.id, slug: cityInput.slug } },
                  create: { countryId: country.id, regionId: region.id, name: cityInput.name, slug: cityInput.slug, latitude: cityInput.latitude ?? null, longitude: cityInput.longitude ?? null, status: cityInput.status, metadata: cityInput.metadata || undefined },
                  update: overwrite ? { regionId: region.id, name: cityInput.name, latitude: cityInput.latitude ?? null, longitude: cityInput.longitude ?? null, status: cityInput.status, metadata: cityInput.metadata || undefined } : {},
                });
                summary.cities += 1;
                for (const destinationInput of cityInput.destinations) {
                  await upsertDestination(tx, destinationInput, country, region, city, overwrite);
                  summary.destinations += 1;
                }
              }
            }

            for (const cityInput of countryInput.cities) {
              const city = await tx.city.upsert({
                where: { countryId_slug: { countryId: country.id, slug: cityInput.slug } },
                create: { countryId: country.id, name: cityInput.name, slug: cityInput.slug, latitude: cityInput.latitude ?? null, longitude: cityInput.longitude ?? null, status: cityInput.status, metadata: cityInput.metadata || undefined },
                update: overwrite ? { name: cityInput.name, latitude: cityInput.latitude ?? null, longitude: cityInput.longitude ?? null, status: cityInput.status, metadata: cityInput.metadata || undefined } : {},
              });
              summary.cities += 1;
              for (const destinationInput of cityInput.destinations) {
                await upsertDestination(tx, destinationInput, country, null, city, overwrite);
                summary.destinations += 1;
              }
            }
            for (const destinationInput of countryInput.destinations) {
              await upsertDestination(tx, destinationInput, country, null, null, overwrite);
              summary.destinations += 1;
            }
          }
        }
      });
      res.json({ ok: true, synced: true, summary });
    } catch (error) { next(error); }
  });

  return router;
}

async function upsertDestination(tx, input, country, region, city, overwrite) {
  const data = {
    name: input.name,
    country: country.name,
    region: region?.name || null,
    countryId: country.id,
    regionId: region?.id || null,
    cityId: city?.id || null,
    type: input.type || "destination",
    status: input.status,
    tagline: input.tagline || null,
    summary: input.summary || null,
    latitude: input.latitude ?? city?.latitude ?? null,
    longitude: input.longitude ?? city?.longitude ?? null,
    metadata: input.metadata || undefined,
    publishedAt: input.status === "published" ? new Date() : null,
  };
  return tx.destination.upsert({ where: { slug: input.slug }, create: { slug: input.slug, ...data }, update: overwrite ? data : {} });
}

module.exports = createTaxonomyRoutes;
