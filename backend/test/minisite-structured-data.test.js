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
  buildWebPage,
  buildWebSite,
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

const publicOrigin =
  "https://agences.mondescale.com";

const canonicalSiteUrl =
  `${publicOrigin}/agence/${site.slug}`;

test(
  "génère TravelAgency et LocalBusiness sur l'URL canonique",
  () => {
    const result =
      buildTravelAgency({
        agency,
        site,
        publicOrigin,
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

    assert.equal(
      result.url,
      canonicalSiteUrl
    );

    assert.equal(
      result["@id"],
      `${canonicalSiteUrl}#travel-agency`
    );
  }
);

test(
  "génère WebSite et WebPage sur /agence",
  () => {
    const website =
      buildWebSite({
        agency,
        site,
        publicOrigin,
      });

    const webpage =
      buildWebPage({
        agency,
        site,
        page: {
          slug:
            "services",
          title:
            "Nos services",
          seoTitle:
            "Services voyage",
          metaDescription:
            "Nos services voyage.",
        },
        publicOrigin,
      });

    assert.equal(
      website.url,
      canonicalSiteUrl
    );

    assert.equal(
      website["@id"],
      `${canonicalSiteUrl}#website`
    );

    assert.equal(
      webpage.url,
      `${canonicalSiteUrl}/services`
    );

    assert.equal(
      webpage.isPartOf["@id"],
      `${canonicalSiteUrl}#website`
    );

    assert.equal(
      webpage.about["@id"],
      `${canonicalSiteUrl}#travel-agency`
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
        publicOrigin,
      });

    assert.equal(
      result.itemListElement
        .length,
      1
    );

    assert.equal(
      result.itemListElement[0]
        .item,
      canonicalSiteUrl
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
        publicOrigin,
      });

    assert.equal(
      result.itemListElement
        .length,
      2
    );

    assert.equal(
      result.itemListElement[1]
        .item,
      `${canonicalSiteUrl}/services`
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

        publicOrigin,
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
        publicOrigin,

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
