"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  buildSeoPlan,
  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
} = require(
  "../src/modules/minisite-seo-enrichment"
);

const agency = {
  id:
    6,

  name:
    "Ambassade FRAM - Mondescale Bois-Colombes",

  city:
    "Bois-Colombes",
};

const site = {
  id:
    "site-1",

  slug:
    "ambassade-fram-mondescale-bois-colombes",
};

test(
  "génère un titre local pour l’accueil",
  () => {
    const title =
      titleForPage({
        agency,

        page: {
          slug:
            "",

          title:
            "Accueil",
        },
      });

    assert.ok(
      title.includes(
        "Bois-Colombes"
      )
    );

    assert.ok(
      title.length <=
      65
    );
  }
);

test(
  "génère une description bornée",
  () => {
    const description =
      descriptionForPage({
        agency,

        page: {
          slug:
            "services",

          title:
            "Nos services",
        },
      });

    assert.ok(
      description.length <=
      160
    );

    assert.ok(
      description.includes(
        "Bois-Colombes"
      )
    );
  }
);

test(
  "préserve les métadonnées existantes",
  () => {
    const result =
      generateSeoMetadata({
        agency,

        site,

        publicOrigin:
          "https://agences.mondescale.com",

        page: {
          id:
            "page-1",

          slug:
            "services",

          title:
            "Nos services",

          seoTitle:
            "Titre existant",

          metaDescription:
            "Description existante",
        },
      });

    assert.equal(
      result.generated
        .seoTitle,
      "Titre existant"
    );

    assert.equal(
      result.generated
        .metaDescription,
      "Description existante"
    );

    assert.equal(
      result.actions
        .setSeoTitle,
      false
    );

    assert.equal(
      result.actions
        .setMetaDescription,
      false
    );
  }
);

test(
  "les pages légales passent en noindex",
  () => {
    const result =
      generateSeoMetadata({
        agency,

        site,

        publicOrigin:
          "https://agences.mondescale.com",

        page: {
          id:
            "page-1",

          slug:
            "mentions-legales",

          title:
            "Mentions légales",
        },
      });

    assert.equal(
      result.generated
        .robots
        .index,
      false
    );
  }
);

test(
  "le plan compte les métadonnées manquantes",
  () => {
    const result =
      buildSeoPlan({
        publicOrigin:
          "https://agences.mondescale.com",

        sites: [
          {
            ...site,

            agency,

            pages: [
              {
                id:
                  "page-1",

                slug:
                  "",

                title:
                  "Accueil",

                seoTitle:
                  "",

                metaDescription:
                  "",
              },

              {
                id:
                  "page-2",

                slug:
                  "contact",

                title:
                  "Contact",

                seoTitle:
                  "Contact agence",

                metaDescription:
                  "",
              },
            ],
          },
        ],
      });

    assert.equal(
      result.summary
        .pageCount,
      2
    );

    assert.equal(
      result.summary
        .missingSeoTitles,
      1
    );

    assert.equal(
      result.summary
        .missingMetaDescriptions,
      2
    );
  }
);
