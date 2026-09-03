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
  TemplateLibraryService,
  TemplateRegistry,
  createBuiltinTemplateRegistry,
} =
  require(
    "../src/modules/template-library"
  );

const {
  buildAgencyContext,
} =
  require(
    "../src/modules/content-engine/default-content"
  );

const context =
  buildAgencyContext(
    {
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
    },

    {
      slug:
        "ambassade-fram-mondescale-gien",

      basePath:
        "/agence/ambassade-fram-mondescale-gien",
    }
  );

test(
  "registre builtin contient quatre templates",
  () => {
    const registry =
      createBuiltinTemplateRegistry();

    assert.equal(
      registry.count(),
      4
    );
  }
);

test(
  "HOME default est disponible",
  () => {
    const service =
      new TemplateLibraryService();

    const template =
      service.defaultForPage(
        "HOME"
      );

    assert.equal(
      template.id,
      "mondescale.home.default"
    );

    assert.equal(
      template.variant,
      "default"
    );
  }
);

test(
  "renderer résout les variables",
  () => {
    const service =
      new TemplateLibraryService();

    const result =
      service.renderDefault(
        "HOME",
        context
      );

    const serialized =
      JSON.stringify(
        result
      );

    assert.match(
      serialized,
      /Gien/
    );

    assert.match(
      serialized,
      /Ambassade FRAM/
    );

    assert.doesNotMatch(
      serialized,
      /\{\{/
    );
  }
);

test(
  "HOME contient six sections",
  () => {
    const service =
      new TemplateLibraryService();

    const result =
      service.renderDefault(
        "HOME",
        context
      );

    assert.equal(
      result.sections.length,
      6
    );
  }
);

test(
  "liste filtrable par pageType",
  () => {
    const service =
      new TemplateLibraryService();

    const result =
      service.list({
        pageType:
          "CONTACT",
      });

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0].pageType,
      "CONTACT"
    );
  }
);

test(
  "registre refuse un doublon",
  () => {
    const registry =
      new TemplateRegistry();

    const template = {
      id:
        "test.home",

      name:
        "Test",

      kind:
        "page",

      pageType:
        "HOME",

      variant:
        "default",

      version:
        "1.0.0",

      status:
        "active",

      scope:
        "platform",

      sections:
        [],
    };

    registry.register(
      template
    );

    assert.throws(
      () =>
        registry.register(
          template
        ),
      error =>
        error.code ===
        "TEMPLATE_ALREADY_REGISTERED"
    );
  }
);

test(
  "CONTACT résout les coordonnées",
  () => {
    const service =
      new TemplateLibraryService();

    const result =
      service.renderDefault(
        "CONTACT",
        context
      );

    const serialized =
      JSON.stringify(
        result
      );

    assert.match(
      serialized,
      /12 Rue Gambetta/
    );

    assert.match(
      serialized,
      /09 73 03 72 20/
    );
  }
);

test(
  "health expose quatre templates",
  () => {
    const service =
      new TemplateLibraryService();

    assert.deepEqual(
      service.health(),
      {
        module:
          "template-library",

        version:
          "1.0",

        templates:
          4,
      }
    );
  }
);
