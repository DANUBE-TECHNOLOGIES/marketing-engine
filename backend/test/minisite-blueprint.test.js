"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  BLUEPRINTS,
  BlueprintRegistry,
  MiniSiteBlueprintEngine,
  MiniSiteBlueprintService,
} = require(
  "../src/modules/minisite-blueprint"
);

function context(
  overrides = {}
) {
  return {
    agencyId:
      "agency-1",

    agencyName:
      "Ambassade FRAM Mondescale Bois-Colombes",

    city:
      "Bois-Colombes",

    blueprint:
      "fram",

    phone:
      "01 00 00 00 00",

    email:
      "agence@example.com",

    address:
      "1 rue du Voyage",

    postalCode:
      "92270",

    destinations: [
      "Île Maurice",
      "Seychelles",
      "Maldives",
    ],

    services: [
      "Voyages sur mesure",
      "Circuits",
      "Croisières",
    ],

    ...overrides,
  };
}

test(
  "le registre expose trois blueprints",
  () => {
    const registry =
      new BlueprintRegistry(
        BLUEPRINTS
      );

    assert.equal(
      registry.list().length,
      3
    );

    assert.equal(
      registry.has("fram"),
      true
    );
  }
);

test(
  "le registre refuse un doublon",
  () => {
    assert.throws(
      () =>
        new BlueprintRegistry([
          BLUEPRINTS[0],
          BLUEPRINTS[0],
        ]),
      {
        code:
          "BLUEPRINT_DUPLICATE",
      }
    );
  }
);

test(
  "le moteur génère douze pages",
  () => {
    const registry =
      new BlueprintRegistry(
        BLUEPRINTS
      );

    const engine =
      new MiniSiteBlueprintEngine({
        registry,
      });

    const result =
      engine.compose(
        context()
      );

    assert.equal(
      result.summary.pageCount,
      12
    );

    assert.equal(
      result.pages.length,
      12
    );
  }
);

test(
  "aucune page générée n’est vide",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context()
      );

    for (
      const page
      of result.pages
    ) {
      assert.ok(
        page.blocks.length >
        0,
        `${page.slug || "home"} est vide`
      );
    }
  }
);

test(
  "la page accueil contient hero et CTA",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context()
      );

    const home =
      result.pages.find(
        (page) =>
          page.slug === ""
      );

    const types =
      home.blocks.map(
        (block) =>
          block.type
      );

    assert.ok(
      types.includes(
        "hero"
      )
    );

    assert.ok(
      types.includes(
        "cta"
      )
    );
  }
);

test(
  "les pages légales possèdent un bloc legal",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context()
      );

    const legal =
      result.pages.find(
        (page) =>
          page.slug ===
          "mentions-legales"
      );

    const privacy =
      result.pages.find(
        (page) =>
          page.slug ===
          "confidentialite"
      );

    assert.ok(
      legal.blocks.some(
        (block) =>
          block.type ===
          "legal"
      )
    );

    assert.ok(
      privacy.blocks.some(
        (block) =>
          block.type ===
          "legal"
      )
    );
  }
);

test(
  "les métadonnées SEO sont bornées",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context()
      );

    for (
      const page
      of result.pages
    ) {
      assert.ok(
        page.seo.title.length <=
        65
      );

      assert.ok(
        page.seo.description.length <=
        160
      );
    }
  }
);

test(
  "la génération est déterministe",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const first =
      service.preview(
        context()
      );

    const second =
      service.preview(
        context()
      );

    assert.deepEqual(
      first,
      second
    );
  }
);

test(
  "FRAM reçoit ses partenaires par défaut",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context({
          partners: [],
        })
      );

    const page =
      result.pages.find(
        (item) =>
          item.slug ===
          "partenaires"
      );

    const logos =
      page.blocks.find(
        (block) =>
          block.type ===
          "logos"
      );

    assert.ok(
      logos.content.items.some(
        (item) =>
          item.name ===
          "FRAM"
      )
    );
  }
);

test(
  "un blueprint inconnu est refusé",
  () => {
    const service =
      new MiniSiteBlueprintService();

    assert.throws(
      () =>
        service.preview(
          context({
            blueprint:
              "inconnu",
          })
        ),
      {
        code:
          "BLUEPRINT_UNKNOWN",
      }
    );
  }
);

test(
  "la navigation contient primaire secondaire et footer",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.preview(
        context()
      );

    assert.ok(
      result.site.navigation
        .primary.length >
        0
    );

    assert.ok(
      result.site.navigation
        .secondary.length >
        0
    );

    assert.ok(
      result.site.navigation
        .footer.length >
        0
    );
  }
);

test(
  "le health expose la capacité blueprint",
  () => {
    const service =
      new MiniSiteBlueprintService();

    const result =
      service.health();

    assert.equal(
      result.status,
      "ok"
    );

    assert.equal(
      result.deterministic,
      true
    );

    assert.equal(
      result.persistence,
      false
    );
  }
);
