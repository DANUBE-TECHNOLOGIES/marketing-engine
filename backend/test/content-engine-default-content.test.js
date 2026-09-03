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
  DefaultContentBuilder,
  buildAgencyContext,
  buildGeneralSeo,
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

  website:
    "https://example.test",

  googleReviewUrl:
    "https://example.test/reviews",
};

const site = {
  id:
    "site-gien",

  slug:
    "ambassade-fram-mondescale-gien",

  basePath:
    "/agence/ambassade-fram-mondescale-gien",
};

test(
  "le contexte agence normalise les coordonnées",
  () => {
    const context =
      buildAgencyContext(
        agency,
        site
      );

    assert.equal(
      context.agency.city,
      "Gien"
    );

    assert.equal(
      context.agency.fullAddress,
      "12 Rue Gambetta, 45500 Gien"
    );

    assert.equal(
      context.agency.phoneHref,
      "tel:0973037220"
    );
  }
);

test(
  "HOME produit les six sections attendues",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "HOME",
        },
        agency,
        site
      );

    assert.deepEqual(
      result.sections.map(
        section =>
          section.sectionType
      ),
      [
        "hero",
        "agency-introduction",
        "services-highlight",
        "destinations-highlight",
        "trust",
        "contact-cta",
      ]
    );
  }
);

test(
  "les contenus portent leur provenance",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "HOME",
        },
        agency,
        site
      );

    const hero =
      result.sections[0]
        .content;

    assert.equal(
      hero.meta.source,
      "default-builder"
    );

    assert.equal(
      hero.meta.editable,
      true
    );

    assert.equal(
      hero.meta.generator,
      "mondescale-content-engine"
    );

    assert.equal(
      hero.meta.variables.city,
      "Gien"
    );
  }
);

test(
  "HOME est localisée sur la ville",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "HOME",
        },
        agency,
        site
      );

    assert.match(
      JSON.stringify(
        result
      ),
      /Gien/
    );

    assert.doesNotMatch(
      JSON.stringify(
        result
      ),
      /undefined/
    );
  }
);

test(
  "AGENCY produit le contrat Website Engine existant",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "AGENCY",
        },
        agency,
        site
      );

    assert.deepEqual(
      result.sections.map(
        item =>
          item.sectionType
      ),
      [
        "page-header",
        "agency-story",
        "agency-details",
        "trust",
        "contact-cta",
      ]
    );
  }
);

test(
  "SERVICES produit le contrat Website Engine existant",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "SERVICES",
        },
        agency,
        site
      );

    assert.deepEqual(
      result.sections.map(
        item =>
          item.sectionType
      ),
      [
        "page-header",
        "services-grid",
        "custom-travel",
        "booking-support",
        "contact-cta",
      ]
    );
  }
);

test(
  "CONTACT propage les coordonnées réelles",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "CONTACT",
        },
        agency,
        site
      );

    const serialized =
      JSON.stringify(
        result
      );

    assert.match(
      serialized,
      /09 73 03 72 20/
    );

    assert.match(
      serialized,
      /12 Rue Gambetta/
    );
  }
);

test(
  "SEO HOME respecte les longueurs",
  () => {
    const context =
      buildAgencyContext(
        agency,
        site
      );

    const seo =
      buildGeneralSeo(
        "HOME",
        context
      );

    assert.ok(
      seo.title.length <=
      65
    );

    assert.ok(
      seo.description.length <=
      160
    );

    assert.equal(
      seo.schemaType,
      "TravelAgency"
    );
  }
);

test(
  "aucune page inconnue ne produit de contenu arbitraire",
  () => {
    const builder =
      new DefaultContentBuilder();

    const result =
      builder.buildPage(
        {
          pageType:
            "DESTINATION",
        },
        agency,
        site
      );

    assert.deepEqual(
      result.sections,
      []
    );
  }
);
