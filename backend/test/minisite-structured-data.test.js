"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  buildBreadcrumbList,
  buildFaqPage,
  buildStructuredDataPlan,
  buildTravelAgency,
  extractFaqItems,
  validateGraph,
} = require(
  "../src/modules/minisite-structured-data"
);

const agency = {
  id:
    6,

  name:
    "Ambassade FRAM Mondescale Bois-Colombes",

  city:
    "Bois-Colombes",

  address:
    "1 rue du Voyage",

  postalCode:
    "92270",

  phone:
    "01 00 00 00 00",

  email:
    "boiscolombes@mondescale.com",
};

const site = {
  id:
    "site-1",

  slug:
    "ambassade-fram-mondescale-bois-colombes",

  agency,
};

test(
  "génère TravelAgency et LocalBusiness",
  () => {
    const result =
      buildTravelAgency({
        agency,
        site,
        publicOrigin:
          "https://agences.mondescale.com",
      });

    assert.ok(
      Array.isArray(
        result["@type"]
      )
    );

    assert.ok(
      result["@type"]
        .includes(
          "TravelAgency"
        )
    );

    assert.ok(
      result["@type"]
        .includes(
          "LocalBusiness"
        )
    );

    assert.equal(
      result.address
        .addressCountry,
      "FR"
    );
  }
);

test(
  "génère un breadcrumb d’accueil",
  () => {
    const result =
      buildBreadcrumbList({
        site,
        page: {
          slug:
            "",

          title:
            "Accueil",
        },
        publicOrigin:
          "https://agences.mondescale.com",
      });

    assert.equal(
      result.itemListElement
        .length,
      1
    );
  }
);

test(
  "génère un breadcrumb interne",
  () => {
    const result =
      buildBreadcrumbList({
        site,
        page: {
          slug:
            "services",

          title:
            "Nos services",
        },
        publicOrigin:
          "https://agences.mondescale.com",
      });

    assert.equal(
      result.itemListElement
        .length,
      2
    );
  }
);

test(
  "extrait les questions FAQ",
  () => {
    const result =
      extractFaqItems([
        {
          blockType:
            "faq",

          content: {
            items: [
              {
                question:
                  "Comment réserver ?",

                answer:
                  "Contactez notre équipe.",
              },
            ],
          },
        },
      ]);

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0]["@type"],
      "Question"
    );
  }
);

test(
  "ne génère pas FAQPage sans FAQ",
  () => {
    const result =
      buildFaqPage({
        site,

        page: {
          slug:
            "contact",

          blocks: [],
        },

        publicOrigin:
          "https://agences.mondescale.com",
      });

    assert.equal(
      result,
      null
    );
  }
);

test(
  "valide un graphe sans doublon",
  () => {
    const result =
      validateGraph([
        {
          "@type":
            "WebSite",

          "@id":
            "https://example.com#website",
        },

        {
          "@type":
            "WebPage",

          "@id":
            "https://example.com#webpage",
        },
      ]);

    assert.equal(
      result.valid,
      true
    );
  }
);

test(
  "refuse un identifiant dupliqué",
  () => {
    const result =
      validateGraph([
        {
          "@type":
            "WebSite",

          "@id":
            "same-id",
        },

        {
          "@type":
            "WebPage",

          "@id":
            "same-id",
        },
      ]);

    assert.equal(
      result.valid,
      false
    );

    assert.ok(
      result.issues.some(
        (issue) =>
          issue.code ===
          "SCHEMA_ID_DUPLICATED"
      )
    );
  }
);

test(
  "génère un plan réseau valide",
  () => {
    const result =
      buildStructuredDataPlan({
        publicOrigin:
          "https://agences.mondescale.com",

        sites: [
          {
            ...site,

            pages: [
              {
                id:
                  "page-1",

                slug:
                  "",

                title:
                  "Accueil",

                seoTitle:
                  "Agence de voyages à Bois-Colombes",

                metaDescription:
                  "Votre agence de voyages.",

                blocks: [],
              },
            ],
          },
        ],
      });

    assert.equal(
      result.summary
        .siteCount,
      1
    );

    assert.equal(
      result.summary
        .invalidSites,
      0
    );

    assert.equal(
      result.summary
        .pageCount,
      1
    );
  }
);
