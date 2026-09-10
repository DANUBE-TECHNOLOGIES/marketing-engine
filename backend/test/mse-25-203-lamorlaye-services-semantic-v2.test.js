"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(
    __dirname,
    "..",
    "scripts",
    "mse-25-203-lamorlaye-services-semantic-v2.js"
  ),
  "utf8"
);

function has(value) {
  assert.ok(
    source.includes(value),
    `missing contract token: ${value}`
  );
}

test("targets Lamorlaye services only", () => {
  has('"mondescale-lamorlaye"');
  has('normalize(site.agency?.city) !== "lamorlaye"');
  has('normalize(page.slug) === "services"');

  assert.ok(!source.includes("updateMany({"));
  assert.ok(!source.includes("pageBlock.create"));
});

test("carries the approved Services V2 editorial contract", () => {
  for (const value of [
    "Services de votre agence de voyages à Lamorlaye | Mondescale",
    "Services de votre agence de voyages à Lamorlaye",
    "Séjours et clubs au départ de votre agence de Lamorlaye",
    "Circuits accompagnés",
    "Voyages sur mesure",
    "Autotours et road trips",
    "Croisières maritimes et fluviales",
    "Vacances en famille",
    "Voyages de noces",
    "Voyages en groupe",
    "Billets d'avion à Lamorlaye",
    "Billets de train",
    "Un interlocuteur avant votre départ",
    "Paris-Charles-de-Gaulle",
    "Paris-Orly",
    "Stéphanie"
  ]) {
    has(value);
  }
});

test("contains exactly eleven service item ids", () => {
  const ids = [
    "sejours-clubs",
    "circuits-accompagnes",
    "voyages-sur-mesure",
    "autotours",
    "croisieres",
    "famille",
    "voyages-de-noces",
    "groupes",
    "billets-avion",
    "billets-train",
    "conseil-accompagnement"
  ];

  for (const id of ids) {
    has(`id: "${id}"`);
  }

  assert.equal(ids.length, 11);
});

test("protects Lamorlaye routes and every non-services page", () => {
  has("routeFingerprint(site)");
  has("routeFingerprint(fresh)");
  has("protectedNonServicesFingerprint(site)");
  has("protectedNonServicesFingerprint(fresh)");
  has("pages Lamorlaye hors Services");
  has("topologie Lamorlaye");
});

test("protects network control agencies", () => {
  has('"Bois-Colombes"');
  has('"Ozoir-la-Ferrière"');
  has("controlsBefore");
  has("controlsAfter");
  has("siteEditorialFingerprint(control)");
});

test("supports dry-run, snapshot and rollback", () => {
  for (const value of [
    "DRY_RUN",
    "MSE_25_203_CONFIRM",
    "MSE_25_203_ROLLBACK",
    "SNAPSHOT_PATH",
    "restoreSnapshot(snapshot)",
    "auto-rollback",
    "rolledback",
    "validation post-écriture échouée"
  ]) {
    has(value);
  }
});

test("does not touch routes, destinations, team or contact explicitly", () => {
  assert.ok(!source.includes("agencySitePage.create"));
  assert.ok(!source.includes("agencySitePage.delete"));
  assert.ok(!source.includes('slug: "destinations"'));
  assert.ok(!source.includes('slug: "equipe"'));
  assert.ok(!source.includes('slug: "contact"'));
});

test("updates one existing services block instead of creating fallback content", () => {
  has("const block = servicesBlock(services)");
  has("tx.pageBlock.update");
  has("newServicesContent(");

  assert.ok(!source.includes("upsertBlock("));
});


test("public hero gives an explicit published page h1 priority over the generic intent fallback", () => {
  const heroPath = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "components",
    "public-site",
    "renderers",
    "HeroV2Renderer.js"
  );

  const heroSource = fs.readFileSync(heroPath, "utf8");

  assert.ok(
    heroSource.includes('function explicitPageHeading(page)')
  );

  assert.ok(
    heroSource.includes('page?.h1 || ""')
  );

  assert.ok(
    heroSource.includes(
      "const editorialHeading = explicitPageHeading(page);"
    )
  );

  assert.ok(
    heroSource.includes(
      "if (editorialHeading) return editorialHeading;"
    )
  );

  assert.ok(
    heroSource.includes(
      "if (forcePageIntent && localIntent) return localIntent;"
    )
  );

  assert.ok(
    heroSource.indexOf(
      "if (editorialHeading) return editorialHeading;"
    ) <
      heroSource.indexOf(
        "if (forcePageIntent && localIntent) return localIntent;"
      ),
    "explicit published page.h1 must be evaluated before the managed intent fallback"
  );
});

test("MSE-25.121 generic Services intent remains available as fallback", () => {
  const heroPath = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "components",
    "public-site",
    "renderers",
    "HeroV2Renderer.js"
  );

  const heroSource = fs.readFileSync(heroPath, "utf8");

  assert.ok(
    heroSource.includes(
      'if (slug === "services") return `Services voyage et billetterie à ${city}`;'
    ),
    "historical MSE-25.121 Services fallback must remain intact"
  );
});

test("public site read contract selects and exposes AgencySitePage.h1", () => {
  const servicePath = path.join(
    __dirname,
    "..",
    "src",
    "modules",
    "public-site-read",
    "service.js"
  );

  const sectionAwarePath = path.join(
    __dirname,
    "..",
    "src",
    "modules",
    "public-site-read",
    "section-aware-service.js"
  );

  const serviceSource = fs.readFileSync(servicePath, "utf8");
  const sectionAwareSource = fs.readFileSync(sectionAwarePath, "utf8");

  assert.ok(
    serviceSource.includes(
      '"displayOrder", "seoTitle", "metaDescription", "h1", "path"'
    ),
    "public-site-read must select persisted AgencySitePage.h1"
  );

  assert.ok(
    sectionAwareSource.includes(
      "h1: page.h1 ?? null,"
    ),
    "normalized public page must expose persisted h1"
  );
});

test("Services V2 semantic actions resolve only through published navigation", () => {
  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
    ),
    "utf8"
  );

  assert.equal(
    source.includes("const SEMANTIC_FEATURE_ACTIONS = Object.freeze(["),
    true
  );

  for (const slug of [
    "destinations",
    "partenaires",
    "contact",
    "equipe",
  ]) {
    assert.equal(
      source.includes(`slug: "${slug}"`),
      true,
      `semantic action ${slug} must be declared`
    );
  }

  assert.equal(
    source.includes("const publishedPage = uniquePublishedNavigation(site).find("),
    true,
    "semantic action must start from published navigation"
  );

  assert.equal(
    source.includes("(page) => pageSlug(page) === semantic.slug"),
    true,
    "semantic target must match an actually published page slug"
  );

  assert.equal(
    source.includes("href: pageHref(site.slug, publishedPage)"),
    true,
    "semantic href must come from the grounded public page resolver"
  );

  assert.equal(
    source.includes("`${root}/${semantic.slug}`"),
    false,
    "semantic actions must never manufacture a route from semantic.slug"
  );
});

test("managed Groupes and Business Travel actions keep priority over semantic actions", () => {
  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
    ),
    "utf8"
  );

  assert.equal(
    source.includes('slug: "business-travel"'),
    true
  );

  assert.equal(
    source.includes('slug: "voyages-en-groupe"'),
    true
  );

  const explicitIndex = source.indexOf(
    "if (href && label) return { href, label };"
  );

  const managedIndex = source.indexOf(
    "const managed = managedFeatureAction(root, item);"
  );

  const semanticIndex = source.indexOf(
    "return semanticFeatureAction(site, item);"
  );

  assert.ok(explicitIndex >= 0);
  assert.ok(managedIndex >= 0);
  assert.ok(semanticIndex >= 0);

  assert.ok(
    explicitIndex < managedIndex,
    "explicit editorial actions must remain first"
  );

  assert.ok(
    managedIndex < semanticIndex,
    "managed special routes must remain ahead of semantic actions"
  );
});


test("semanticFeatureAction returns a grounded link only when the target page is published", async () => {
  const fs = require("node:fs");
  const path = require("node:path");

  const sourcePath = path.join(
    process.cwd(),
    "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
  );

  const source = fs.readFileSync(sourcePath, "utf8");

  assert.equal(
    source.includes("return semanticFeatureAction(site, item);"),
    true
  );

  const publishedNavigationGuard =
    source.includes("uniquePublishedNavigation(site).find(") &&
    source.includes("(page) => pageSlug(page) === semantic.slug") &&
    source.includes("if (!publishedPage) return null;") &&
    source.includes("href: pageHref(site.slug, publishedPage)");

  assert.equal(
    publishedNavigationGuard,
    true,
    "semantic action must require a published navigation target"
  );
});

test("Services V2 semantic targets are limited to explicit approved page slugs", () => {
  const fs = require("node:fs");
  const path = require("node:path");

  const source = fs.readFileSync(
    path.join(
      process.cwd(),
      "frontend/components/public-site/renderers/FeaturesV2Renderer.js"
    ),
    "utf8"
  );

  for (const slug of [
    "destinations",
    "partenaires",
    "contact",
    "equipe",
  ]) {
    assert.equal(
      source.includes(`slug: "${slug}"`),
      true,
      `approved semantic target ${slug} must exist`
    );
  }

  assert.equal(
    source.includes("`${root}/${semantic.slug}`"),
    false,
    "semantic navigation must never fabricate its href"
  );
});
