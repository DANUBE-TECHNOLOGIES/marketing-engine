"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BLOCK_DEFINITIONS,
  BlockRegistry,
  PageBuilderService,
} = require("../src/modules/page-builder");

test("le registre expose les blocs essentiels du mini-site", () => {
  const registry = new BlockRegistry();

  assert.equal(registry.has("hero"), true);
  assert.equal(registry.has("faq"), true);
  assert.equal(registry.has("cta"), true);
  assert.equal(registry.has("agency"), true);
  assert.equal(registry.has("offers"), true);
  assert.equal(registry.has("destinations"), true);
  assert.ok(registry.list().length >= 10);
});

test("les définitions de blocs ont des types uniques", () => {
  const types = BLOCK_DEFINITIONS.map(
    (definition) => definition.type
  );

  assert.equal(
    new Set(types).size,
    types.length
  );
});

test("le registre refuse un type inconnu", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () => registry.get("bloc-inconnu"),
    { code: "UNKNOWN_BLOCK_TYPE" }
  );
});

test("create produit un hero normalisé", () => {
  const registry = new BlockRegistry();

  const block = registry.create("hero", {
    status: "published",
    position: 0,
    content: {
      title: "Voyage à l’Île Maurice",
      subtitle: "Lagons, plages et douceur de vivre.",
      imageUrl: "https://example.test/maurice.jpg",
      imageAlt: "Plage de l’Île Maurice",
    },
  });

  assert.equal(block.type, "hero");
  assert.equal(block.status, "published");
  assert.equal(block.position, 0);
  assert.equal(
    block.content.title,
    "Voyage à l’Île Maurice"
  );
  assert.equal(
    block.content.primaryCta.href,
    "#contact"
  );
});

test("un hero exige un titre", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () =>
      registry.validate({
        type: "hero",
        content: {
          title: "",
          primaryCta: {
            label: "Nous contacter",
            href: "#contact",
          },
        },
      }),
    { code: "REQUIRED_BLOCK_FIELD" }
  );
});

test("la FAQ exige des questions complètes", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () =>
      registry.validate({
        type: "faq",
        content: {
          title: "Questions fréquentes",
          items: [
            {
              question: "Quand partir ?",
              answer: "",
            },
          ],
        },
      }),
    { code: "REQUIRED_BLOCK_FIELD" }
  );
});

test("les URL dangereuses sont refusées", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () =>
      registry.validate({
        type: "cta",
        content: {
          title: "Contactez-nous",
          text: "",
          primaryCta: {
            label: "Cliquer",
            href: "javascript:alert(1)",
          },
          secondaryCta: null,
          style: "primary",
        },
      }),
    { code: "UNSAFE_BLOCK_URL" }
  );
});

test("validatePage trie les blocs par position", () => {
  const registry = new BlockRegistry();

  const blocks = registry.validatePage([
    registry.create("cta", {
      position: 2,
    }),
    registry.create("rich_text", {
      position: 1,
      content: {
        html: "<p>Présentation</p>",
      },
    }),
    registry.create("hero", {
      position: 0,
    }),
  ]);

  assert.deepEqual(
    blocks.map((block) => block.type),
    ["hero", "rich_text", "cta"]
  );
});

test("validatePage refuse deux blocs singleton identiques", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () =>
      registry.validatePage([
        registry.create("hero", {
          position: 0,
        }),
        registry.create("hero", {
          position: 1,
        }),
      ]),
    { code: "DUPLICATE_SINGLETON_BLOCK" }
  );
});

test("validatePage refuse les positions dupliquées", () => {
  const registry = new BlockRegistry();

  assert.throws(
    () =>
      registry.validatePage([
        registry.create("hero", {
          position: 0,
        }),
        registry.create("cta", {
          position: 0,
        }),
      ]),
    { code: "DUPLICATE_BLOCK_POSITION" }
  );
});

test("le service produit le résumé d’une page", () => {
  const service = new PageBuilderService();

  const result = service.validatePage({
    blocks: [
      service.createBlock("hero", {
        status: "published",
        position: 0,
      }),
      service.createBlock("rich_text", {
        status: "draft",
        position: 1,
        content: {
          html: "<p>Présentation</p>",
        },
      }),
      service.createBlock("cta", {
        status: "hidden",
        position: 2,
      }),
    ],
  });

  assert.equal(result.count, 3);
  assert.equal(result.publishedCount, 1);
  assert.equal(result.hiddenCount, 1);
});

test("health expose la capacité page builder", () => {
  const service = new PageBuilderService();
  const health = service.health();

  assert.equal(health.status, "ok");
  assert.equal(
    health.capability,
    "page-builder-block-registry"
  );
  assert.ok(health.blockTypes >= 10);
  assert.ok(health.categories.includes("seo"));
  assert.ok(health.singletonTypes.includes("hero"));
});
