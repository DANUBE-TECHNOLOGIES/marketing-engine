"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  asTargetCities,
  buildAgencyManifest,
  report,
  teamAudit,
} = require("../src/knowledge/network-geo.service");

function teamBlock(members) {
  return {
    id: "block-team",
    blockType: "team",
    status: "published",
    content: { members },
  };
}

function source({ id, name, city, slug, seoCity, targetCities, members = [] }) {
  return {
    id,
    tenantId: "tenant-1",
    name,
    city,
    seoSite: slug
      ? {
          id: `seo-${id}`,
          slug,
          seoCity: seoCity || city,
          targetCities: targetCities || [],
          status: "published",
        }
      : null,
    agencySites: [
      {
        id: `site-${id}`,
        slug: slug || `site-${id}`,
        status: "published",
        pages: [
          {
            id: `page-${id}`,
            slug: "equipe",
            status: "published",
            published: true,
            blocks: [teamBlock(members)],
          },
        ],
      },
    ],
  };
}

test("network manifest is deterministic and contains no inferred expertise", () => {
  const manifest = buildAgencyManifest(source({
    id: 1,
    name: "Mondescale Maurepas",
    city: "Maurepas",
    slug: "maurepas",
  }));

  assert.equal(manifest.key, "network:maurepas");
  assert.equal(manifest.entities.length, 1);
  assert.equal(manifest.entities[0].slug, "mondescale-maurepas");
  assert.equal(manifest.entities[0].type, "agency");
  assert.deepEqual(manifest.relations, []);
  assert.deepEqual(manifest.expertise, []);
});

test("targetCities accepts explicit string/object cities and deduplicates accents/case", () => {
  assert.deepEqual(
    asTargetCities([
      "Élancourt",
      { name: "elancourt" },
      { city: "Coignières" },
      "La Verrière",
    ]),
    ["Élancourt", "Coignières", "La Verrière"]
  );
});

test("team audit counts only published explicit members and preserves exact Knowledge links", () => {
  const audit = teamAudit(source({
    id: 1,
    name: "Mondescale Maurepas",
    city: "Maurepas",
    slug: "maurepas",
    members: [
      { name: "Anisia", knowledgeEntityId: "kg-anisia" },
      { name: "Votre équipe" },
      { name: "Nouveau conseiller" },
    ],
  }));

  assert.equal(audit.explicitMembers, 2);
  assert.equal(audit.linkedMembers, 1);
  assert.equal(audit.unlinkedMembers, 1);
  assert.deepEqual(audit.members[0], {
    name: "Anisia",
    knowledgeEntityId: "kg-anisia",
  });
});

test("one network report handles compliant, missing and blocked agencies in one pass with zero writes", async () => {
  const sources = [
    source({
      id: 1,
      name: "Mondescale Maurepas",
      city: "Maurepas",
      slug: "maurepas",
      targetCities: ["Élancourt", "Coignières"],
      members: [{ name: "Anisia", knowledgeEntityId: "kg-anisia" }],
    }),
    source({
      id: 2,
      name: "Mondescale Dax",
      city: "Dax",
      slug: "dax",
      members: [{ name: "Sylvie" }],
    }),
    source({
      id: 3,
      name: "Agence sans mini-site canonique",
      city: "Ville X",
      slug: null,
    }),
  ];

  const snapshotCalls = [];
  const result = await report({
    tenantId: "tenant-1",
    sourceLoader: async (tenantId) => {
      assert.equal(tenantId, "tenant-1");
      return sources;
    },
    snapshotLoader: async (manifest) => {
      snapshotCalls.push(manifest.key);

      if (manifest.key === "network:maurepas") {
        return {
          existingEntities: [
            {
              id: "agency-maurepas",
              type: "agency",
              slug: "mondescale-maurepas",
              title: "Mondescale Maurepas",
              status: "published",
              language: "fr",
              summary: "Agence de voyages Mondescale à Maurepas.",
            },
          ],
          existingRelations: [],
        };
      }

      return { existingEntities: [], existingRelations: [] };
    },
  });

  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.summary.sourceAgencyCount, 3);
  assert.equal(result.summary.eligibleAgencyCount, 2);
  assert.equal(result.summary.blockedAgencyCount, 1);
  assert.deepEqual(snapshotCalls, ["network:maurepas", "network:dax"]);

  const maurepas = result.agencies.find((agency) => agency.siteSlug === "maurepas");
  const dax = result.agencies.find((agency) => agency.siteSlug === "dax");

  assert.equal(maurepas.summary.actionable, 0);
  assert.equal(maurepas.summary.noop, 1);
  assert.deepEqual(maurepas.targetCities, ["Élancourt", "Coignières"]);
  assert.equal(maurepas.team.linkedMembers, 1);
  assert.equal(dax.summary.actionable, 1);
  assert.equal(dax.actions[0].action, "create_entity");
  assert.equal(dax.team.unlinkedMembers, 1);
  assert.equal(result.agencies.some((agency) => agency.expertInPlanned), false);
});

test("network endpoint is GET-only and mounted before generic Knowledge id route", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/network-geo.routes.js"),
    "utf8"
  );
  const knowledgeRoutes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/knowledge.routes.js"),
    "utf8"
  );

  assert.match(routes, /router\.get\(\s*[\r\n ]*"\/report"/);
  assert.doesNotMatch(routes, /router\.(post|put|patch|delete)\s*\(/);

  const networkPosition = knowledgeRoutes.indexOf('"/geo/network"');
  const genericPosition = knowledgeRoutes.indexOf('"/:id"');
  assert.ok(networkPosition >= 0);
  assert.ok(genericPosition > networkPosition);
});
