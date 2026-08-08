"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  ContentVariablesEngine,
  extractVariables,
  resolveTemplate,
  resolveObjectTemplates,
} =
  require(
    "../src/modules/content-engine/variables"
  );

const {
  buildAgencyContext,
} =
  require(
    "../src/modules/content-engine/default-content"
  );

const agency = {
  id:
    4,

  name:
    "Ambassade FRAM - Mondescale Gien",

  city:
    "Gien",

  address:
    "12 Rue Gambetta",

  postalCode:
    "45500",

  phone:
    "09 73 03 72 20",

  email:
    "gien@example.test",
};

const site = {
  slug:
    "ambassade-fram-mondescale-gien",

  basePath:
    "/agence/ambassade-fram-mondescale-gien",
};

const context =
  buildAgencyContext(
    agency,
    site
  );

test(
  "extrait les variables",
  () => {
    assert.deepEqual(
      extractVariables(
        "{{agency.name}} à {{agency.city}} / {{agency.name}}"
      ),
      [
        "agency.name",
        "agency.city",
      ]
    );
  }
);

test(
  "résout une variable simple",
  () => {
    const result =
      resolveTemplate(
        "Agence à {{agency.city}}",
        context
      );

    assert.equal(
      result.value,
      "Agence à Gien"
    );
  }
);

test(
  "résout plusieurs variables",
  () => {
    const result =
      resolveTemplate(
        "{{agency.name}} - {{agency.phone}}",
        context
      );

    assert.equal(
      result.value,
      "Ambassade FRAM - Mondescale Gien - 09 73 03 72 20"
    );
  }
);

test(
  "variable inconnue devient vide par défaut",
  () => {
    const result =
      resolveTemplate(
        "Bonjour {{unknown.value}} !",
        context
      );

    assert.equal(
      result.value,
      "Bonjour  !"
    );

    assert.deepEqual(
      result.missing,
      [
        "unknown.value",
      ]
    );
  }
);

test(
  "mode strict refuse les variables absentes",
  () => {
    assert.throws(
      () =>
        resolveTemplate(
          "{{agency.unknown}}",
          context,
          {
            strict:
              true,
          }
        ),
      error =>
        error.code ===
        "CONTENT_VARIABLES_MISSING"
    );
  }
);

test(
  "résout récursivement un objet",
  () => {
    const result =
      resolveObjectTemplates(
        {
          title:
            "{{agency.city}}",

          nested: {
            phone:
              "{{agency.phone}}",
          },

          array: [
            "{{agency.name}}",
          ],
        },
        context
      );

    assert.equal(
      result.value.title,
      "Gien"
    );

    assert.equal(
      result.value.nested.phone,
      "09 73 03 72 20"
    );

    assert.equal(
      result.value.array[0],
      "Ambassade FRAM - Mondescale Gien"
    );
  }
);

test(
  "ContentVariablesEngine expose le registre",
  () => {
    const engine =
      new ContentVariablesEngine();

    const registry =
      engine.registry();

    assert.ok(
      registry.some(
        item =>
          item.key ===
          "agency.city"
      )
    );

    assert.ok(
      registry.some(
        item =>
          item.key ===
          "agency.phone"
      )
    );
  }
);

test(
  "les chemins calculés sont disponibles",
  () => {
    const engine =
      new ContentVariablesEngine();

    assert.equal(
      engine.render(
        "{{computed.contactPath}}",
        context
      ).value,
      "/contact"
    );
  }
);
