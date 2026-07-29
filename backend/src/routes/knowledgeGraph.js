"use strict";

const express = require("express");
const {
  normalizeText,
  textScore,
  deduplicateRanked,
  recommendationScore,
} = require("../lib/knowledgeEngine");

const MAP = {
  countries: "country",
  regions: "region",
  cities: "city",
  themes: "theme",
  "travel-types": "travelType",
  tags: "tag",
};
const SEARCH_MODELS = [
  ["country", "country"], ["region", "region"], ["city", "city"],
  ["destination", "destination"], ["theme", "theme"],
  ["travelType", "travelType"], ["tag", "tag"],
];
const clean = (value) => Object.fromEntries(Object.entries(value || {}).filter(([, x]) => x !== undefined));
const intParam = (value, fallback, max) => Math.min(Math.max(Number.parseInt(value, 10) || fallback, 1), max);

module.exports = function createKnowledgeGraphRoutes(prisma) {
  const router = express.Router();

  router.get("/knowledge/health", async (_req, res, next) => {
    try {
      const [countries, regions, cities, themes, travelTypes, tags, aliases, relations] = await Promise.all([
        prisma.country.count(), prisma.region.count(), prisma.city.count(), prisma.theme.count(),
        prisma.travelType.count(), prisma.tag.count(), prisma.knowledgeAlias.count(),
        prisma.destinationRelation.count(),
      ]);
      res.json({ ok: true, version: "0.9.1", capabilities: ["taxonomy", "aliases", "fuzzy-search", "recommendations"], counts: { countries, regions, cities, themes, travelTypes, tags, aliases, relations } });
    } catch (error) { next(error); }
  });

  for (const [path, model] of Object.entries(MAP)) {
    router.get(`/knowledge/${path}`, async (req, res, next) => {
      try {
        res.json(await prisma[model].findMany({
          where: req.query.status ? { status: String(req.query.status) } : {},
          orderBy: { name: "asc" }, take: intParam(req.query.limit, 200, 500),
        }));
      } catch (error) { next(error); }
    });
    router.post(`/knowledge/${path}`, async (req, res, next) => {
      try { res.status(201).json(await prisma[model].create({ data: clean(req.body) })); }
      catch (error) { next(error); }
    });
    router.patch(`/knowledge/${path}/:id`, async (req, res, next) => {
      try { res.json(await prisma[model].update({ where: { id: req.params.id }, data: clean(req.body) })); }
      catch (error) { next(error); }
    });
  }

  router.get("/knowledge/search", async (req, res, next) => {
    try {
      const query = String(req.query.q || "").trim();
      if (query.length < 2) return res.status(400).json({ error: "Le paramètre q doit contenir au moins 2 caractères." });
      const limit = intParam(req.query.limit, 20, 100);
      const requestedTypes = new Set(String(req.query.types || "").split(",").map((x) => x.trim()).filter(Boolean));
      const activeModels = SEARCH_MODELS.filter(([, entityType]) => !requestedTypes.size || requestedTypes.has(entityType));
      const directGroups = await Promise.all(activeModels.map(async ([model, entityType]) => {
        const rows = await prisma[model].findMany({ select: { id: true, name: true, slug: true, status: true }, take: 500 });
        return rows.map((row) => ({ ...row, entityType, score: textScore(query, row.name), matchedBy: "name" }));
      }));
      const aliases = await prisma.knowledgeAlias.findMany({
        where: requestedTypes.size ? { entityType: { in: [...requestedTypes] } } : {}, take: 500,
      });
      const aliasCandidates = aliases.map((alias) => ({
        id: alias.entityId, entityType: alias.entityType, name: alias.alias, slug: null, status: null,
        score: textScore(query, alias.alias) + (alias.isPrimary ? 2 : 0), matchedBy: "alias", alias: alias.alias,
      }));
      const results = deduplicateRanked([...directGroups.flat(), ...aliasCandidates].filter((x) => x.score >= 45), limit);
      return res.json({ query, normalizedQuery: normalizeText(query), total: results.length, results });
    } catch (error) { next(error); }
  });

  router.post("/knowledge/aliases", async (req, res, next) => {
    try {
      const { entityType, entityId, alias, locale = "fr", isPrimary = false } = req.body || {};
      if (!entityType || !entityId || !alias) return res.status(400).json({ error: "entityType, entityId et alias sont obligatoires." });
      const result = await prisma.knowledgeAlias.upsert({
        where: { entityType_entityId_normalizedAlias_locale: { entityType, entityId, normalizedAlias: normalizeText(alias), locale } },
        update: { alias, isPrimary: Boolean(isPrimary) },
        create: { entityType, entityId, alias, normalizedAlias: normalizeText(alias), locale, isPrimary: Boolean(isPrimary) },
      });
      res.status(201).json(result);
    } catch (error) { next(error); }
  });

  router.get("/knowledge/aliases/:entityType/:entityId", async (req, res, next) => {
    try { res.json(await prisma.knowledgeAlias.findMany({ where: req.params, orderBy: [{ isPrimary: "desc" }, { alias: "asc" }] })); }
    catch (error) { next(error); }
  });

  router.put("/knowledge/relations/destinations", async (req, res, next) => {
    try {
      const { sourceId, targetId, relationType = "similar", score = 50, origin = "manual", metadata } = req.body || {};
      if (!sourceId || !targetId || sourceId === targetId) return res.status(400).json({ error: "sourceId et targetId distincts sont obligatoires." });
      const boundedScore = Math.min(100, Math.max(0, Number(score) || 0));
      const relation = await prisma.destinationRelation.upsert({
        where: { sourceId_targetId_relationType: { sourceId, targetId, relationType } },
        update: { score: boundedScore, origin, metadata },
        create: { sourceId, targetId, relationType, score: boundedScore, origin, metadata },
      });
      res.json(relation);
    } catch (error) { next(error); }
  });

  router.get("/knowledge/recommendations/:slug", async (req, res, next) => {
    try {
      const limit = intParam(req.query.limit, 8, 30);
      const source = await prisma.destination.findUnique({
        where: { slug: req.params.slug },
        include: { themes: true, travelTypes: true, relationsFrom: { include: { target: true }, orderBy: { score: "desc" } } },
      });
      if (!source) return res.status(404).json({ error: "Destination introuvable." });
      const candidates = await prisma.destination.findMany({
        where: { id: { not: source.id }, status: "published" },
        include: { themes: true, travelTypes: true }, take: 500,
      });
      const automatic = candidates.map((candidate) => {
        const ranked = recommendationScore(source, candidate);
        return { id: candidate.id, slug: candidate.slug, name: candidate.name, score: ranked.score, reasons: ranked.reasons, origin: "computed" };
      }).filter((x) => x.score > 0);
      const explicit = source.relationsFrom.map((relation) => ({
        id: relation.target.id, slug: relation.target.slug, name: relation.target.name,
        score: relation.score, reasons: [relation.relationType], origin: relation.origin,
      }));
      const recommendations = deduplicateRanked([...explicit, ...automatic], limit);
      res.json({ source: { id: source.id, slug: source.slug, name: source.name }, total: recommendations.length, recommendations });
    } catch (error) { next(error); }
  });

  router.get("/public/knowledge/countries", async (_req, res, next) => {
    try { res.json(await prisma.country.findMany({ where: { status: "published" }, include: { regions: { where: { status: "published" } }, cities: { where: { status: "published" } } }, orderBy: { name: "asc" } })); }
    catch (error) { next(error); }
  });
  router.get("/public/knowledge/taxonomies", async (_req, res, next) => {
    try {
      const [themes, travelTypes, tags] = await Promise.all([
        prisma.theme.findMany({ where: { status: "published" }, orderBy: { name: "asc" } }),
        prisma.travelType.findMany({ where: { status: "published" }, orderBy: { name: "asc" } }),
        prisma.tag.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
      ]);
      res.json({ themes, travelTypes, tags });
    } catch (error) { next(error); }
  });
  router.get("/public/knowledge/destinations/:slug", async (req, res, next) => {
    try {
      const destination = await prisma.destination.findFirst({
        where: { slug: req.params.slug, status: "published" },
        include: { countryRef: true, regionRef: true, cityRef: true, themes: { include: { theme: true }, orderBy: { weight: "desc" } }, travelTypes: { include: { travelType: true }, orderBy: { weight: "desc" } }, tags: { include: { tag: true } }, sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } } },
      });
      if (!destination) return res.status(404).json({ error: "Destination introuvable" });
      res.json(destination);
    } catch (error) { next(error); }
  });
  return router;
};
