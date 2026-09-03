"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  MiniSiteStructuredDataService,
} = require(
  "../src/modules/minisite-structured-data"
);

test(
  "previewSite retourne le graphe du site demandé",
  async () => {
    const site = {
      id:
        "site-1",

      slug:
        "agence-test",

      agency: {
        id:
          1,

        name:
          "Agence Test",

        city:
          "Paris",
      },

      pages: [
        {
          id:
            "page-1",

          slug:
            "",

          title:
            "Accueil",

          seoTitle:
            "Agence de voyages à Paris",

          metaDescription:
            "Agence de voyages à Paris.",

          blocks: [],
        },
      ],
    };

    const service =
      new MiniSiteStructuredDataService({
        repository: {
          async findSiteBySlug(
            slug
          ) {
            return slug ===
              site.slug
              ? site
              : null;
          },
        },

        publicOrigin:
          "https://agences.mondescale.com",
      });

    const result =
      await service
        .previewSite({
          siteSlug:
            "agence-test",
        });

    assert.equal(
      result.siteSlug,
      "agence-test"
    );

    assert.equal(
      result.validation
        .valid,
      true
    );

    assert.ok(
      Array.isArray(
        result.graph[
          "@graph"
        ]
      )
    );
  }
);

test(
  "previewSite renvoie une erreur 404 si absent",
  async () => {
    const service =
      new MiniSiteStructuredDataService({
        repository: {
          async findSiteBySlug() {
            return null;
          },
        },
      });

    await assert.rejects(
      () =>
        service.previewSite({
          siteSlug:
            "absent",
        }),
      {
        code:
          "MINISITE_STRUCTURED_DATA_SITE_NOT_FOUND",
        status:
          404,
      }
    );
  }
);
